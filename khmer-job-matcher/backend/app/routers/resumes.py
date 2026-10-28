import importlib.util
import re
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, Request, Response, Query
from sqlalchemy import select, func, update
from app.core.dependencies import Database, StudentUser
from app.models import Resume, ResumeChunk, Skill, Application
from app.ml.matching import extract_skills
from app.core.rate_limit import throttle

router = APIRouter(prefix='/api/resumes', tags=['resumes'])
MAX_SIZE = 5 * 1024 * 1024


def metadata(resume):
    return {'id': resume.id, 'filename': resume.filename, 'media_type': resume.media_type, 'size': resume.size,
            'detected_skill_ids': resume.detected_skill_ids, 'created_at': resume.created_at}


@router.get('/capabilities')
def capabilities(user: StudentUser):
    return {'pdf_enabled': importlib.util.find_spec('fitz') is not None, 'text_enabled': True, 'max_bytes': MAX_SIZE}


@router.get('')
def list_resumes(user: StudentUser, db: Database, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return [metadata(item) for item in db.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.id.desc())).all()]


@router.post('', status_code=201)
async def upload(request: Request, user: StudentUser, db: Database, filename: str = Query(..., min_length=1, max_length=150)):
    throttle(db, 'resume-upload', str(user.id), 20, 3600)
    if db.scalar(select(func.count()).select_from(Resume).where(Resume.user_id == user.id)) >= 10:
        raise HTTPException(409, 'Keep at most 10 resumes. Delete an older version first.')
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > MAX_SIZE:
            raise HTTPException(413, 'Resume must be 5 MB or smaller')
    if not content:
        raise HTTPException(422, 'The uploaded file is empty')
    name = re.sub(r'[^\w. ()-]', '_', filename.split('/')[-1].split('\\')[-1])[:150]
    if name.lower().endswith('.pdf'):
        if not bytes(content).startswith(b'%PDF-'):
            raise HTTPException(422, 'File content is not a PDF')
        try:
            import fitz
        except ImportError:
            raise HTTPException(503, 'PDF parsing needs PyMuPDF installed on the server. A UTF-8 .txt resume is supported now.') from None
        try:
            with fitz.open(stream=bytes(content), filetype='pdf') as document:
                if document.needs_pass or document.page_count > 30:
                    raise ValueError('Encrypted or overly long PDF')
                text = '\n'.join(page.get_text() for page in document)[:100000]
        except Exception:
            raise HTTPException(422, 'Cannot read this PDF. Use an unencrypted PDF of at most 30 pages.') from None
        if not text.strip():
            raise HTTPException(422, 'No text found. Scanned resumes need OCR, which is not supported.')
        media_type = 'application/pdf'
    elif name.lower().endswith('.txt'):
        try:
            text = bytes(content).decode('utf-8-sig')
        except UnicodeDecodeError:
            raise HTTPException(422, 'Text resumes must use UTF-8 encoding') from None
        if '\x00' in text or not text.strip():
            raise HTTPException(422, 'Resume must contain readable text')
        media_type = 'text/plain'
    else:
        raise HTTPException(422, 'Choose a PDF or UTF-8 .txt resume')
    detected = extract_skills(text[:100000], db.scalars(select(Skill)).all())
    resume = Resume(user_id=user.id, filename=name, media_type=media_type, size=len(content),
                    content=b'', detected_skill_ids=detected)
    db.add(resume)
    db.flush()
    for part, offset in enumerate(range(0, len(content), 256 * 1024)):
        db.add(ResumeChunk(resume_id=resume.id, part=part, content=bytes(content[offset:offset + 256 * 1024])))
        db.flush()  # Keep each write under XAMPP's default packet limit.
    db.commit()
    db.refresh(resume)
    return metadata(resume)


def file_response(resume):
    content = b''.join(chunk.content for chunk in resume.chunks) if resume.chunks else resume.content
    return Response(content=content, media_type=resume.media_type,
        headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
                 'Content-Disposition': "attachment; filename=resume; filename*=UTF-8''" + quote(resume.filename)})


@router.get('/{resume_id}/file')
def download(resume_id: int, user: StudentUser, db: Database):
    resume = db.scalar(select(Resume).where(Resume.id == resume_id, Resume.user_id == user.id))
    if resume is None:
        raise HTTPException(404, 'Resume not found')
    return file_response(resume)


@router.delete('/{resume_id}', status_code=204)
def delete_resume(resume_id: int, user: StudentUser, db: Database):
    resume = db.scalar(select(Resume).where(Resume.id == resume_id, Resume.user_id == user.id))
    if resume is None:
        raise HTTPException(404, 'Resume not found')
    db.execute(update(Application).where(Application.resume_id == resume.id).values(resume_id=None))
    db.delete(resume)
    db.commit()
    return Response(status_code=204)

"""Exercise the declared PDF parser with synthetic files, never private CVs."""
import pytest

from test_completion import seeker


def test_pdf_text_extraction_and_private_round_trip(client):
    fitz = pytest.importorskip('fitz')
    headers = seeker(client, 'pdf-owner@example.com')
    foreign = seeker(client, 'pdf-foreign@example.com')
    with fitz.open() as document:
        page = document.new_page()
        page.insert_text((72, 72), 'Synthetic resume. Skills: Python, React, HTML and CSS.')
        content = document.tobytes()
    assert client.get('/api/resumes/capabilities', headers=headers).json()['pdf_enabled']
    result = client.post('/api/resumes?filename=synthetic.pdf', headers=headers, content=content)
    assert result.status_code == 201, result.text
    metadata = result.json()
    assert metadata['media_type'] == 'application/pdf'
    assert metadata['detected_skill_ids']
    assert 'content' not in metadata
    downloaded = client.get(f"/api/resumes/{metadata['id']}/file", headers=headers)
    assert downloaded.content == content
    assert downloaded.headers['cache-control'] == 'no-store'
    assert client.get(f"/api/resumes/{metadata['id']}/file", headers=foreign).status_code == 404


def test_unreadable_and_blank_pdfs_are_rejected(client):
    fitz = pytest.importorskip('fitz')
    headers = seeker(client, 'pdf-validation@example.com')
    with fitz.open() as document:
        document.new_page()
        blank = document.tobytes()
    response = client.post('/api/resumes?filename=blank.pdf', headers=headers, content=blank)
    assert response.status_code == 422
    assert 'OCR' in response.json()['error']['message']
    response = client.post('/api/resumes?filename=broken.pdf', headers=headers, content=b'%PDF-1.7 broken')
    assert response.status_code == 422
    assert client.get('/api/resumes', headers=headers).json() == []

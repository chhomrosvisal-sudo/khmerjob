# Hiring card image
## Category pictures

Generated with the built-in image generation tool. Files are saved under `frontend/public/images/job-hiring-{key}.png`. Technology has four variants; design and marketing have two each. The job ID selects a stable variant, and uncategorized jobs use the original team picture. These are illustrative scenes, not photographs of the listed employers.

Each exact prompt is `Photorealistic editorial recruitment website card photograph. ` + the scene below + this suffix:

> Wide horizontal 16:7 composition, main subjects centered with comfortable margins for a shallow card crop. Authentic natural expressions, tasteful professional photography, realistic anatomy and environment. Illustrative fictional workplace, no identifiable real company. No text, no logos, no watermarks. Create a single full image, no collage or panels.

- `technology-2`: Two Cambodian web developers pair programming at a laptop in a bright coworking studio, candid side view, warm wood and green plants.
- `technology-3`: A Cambodian data analyst reviewing abstract charts on a large monitor in a modern analytics office, deep blue interior and daylight, focused professional.
- `technology-4`: A Cambodian IT support engineer testing computer hardware and network equipment at an organized workstation, hands visible, bright contemporary workspace.
- `design-2`: Two Cambodian UX designers sketching interface wireframes on paper around a tablet in a sunlit creative studio, colorful swatches and stationery, candid overhead three-quarter view.
- `marketing-2`: A Cambodian social media creator photographing a small product arrangement with a camera in a bright marketing studio, coral and lavender accents, candid editorial photograph.

Asset: `frontend/public/images/job-hiring-team.png`.

Created with the built-in image generation tool. This decorative image illustrates hiring opportunities; it does not depict a listed employer or its staff. The shared `JobPicture` component displays it on homepage cards, job listings, and job details.

Generation prompt:

> Create a polished wide horizontal editorial photograph for job hiring cards on a Cambodian recruitment website. A welcoming modern Phnom Penh office, three young adult Cambodian professionals collaborating around a laptop at a light wood table, natural candid expressions, smart casual clothing, soft daylight, a few plants, subtle lavender and warm neutral interior accents. Authentic, realistic photography, premium recruitment campaign quality. Frame a wide mid shot suitable for a shallow 16:7 card crop with people centered and comfortable margins. No text, no logos, no watermarks. This is illustrative stock-style imagery, no identifiable company. Save generated image.

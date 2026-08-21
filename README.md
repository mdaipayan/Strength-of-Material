# Strength of Materials — Interactive Digital Textbook

A self-paced, browser-based digital textbook for **Strength of Materials**, built for B.Tech and Diploma Civil Engineering students. Every unit is a single self-contained HTML file with virtual laboratories, live structural solvers, worked numericals and graded self-assessment.

**▶ Live site: [mdaipayan.github.io/Strength-of-Material](https://mdaipayan.github.io/Strength-of-Material/)**

Prepared by **D. Mandal**, Assistant Professor, Department of Civil Engineering.

---

## Why this exists

Strength of Materials is taught as a sequence of dependent results: Unit 2 finds the bending moment, Unit 3 turns it into a stress and a section size, Unit 4 checks whether that section is stiff enough. This textbook keeps that chain intact — each unit opens by using a result the previous one produced — and makes every step something the student can change and recompute rather than only read.

There is no server, no account and no build step. Open the file and it works.

## Course units

| Unit | Topic | Covers | Status |
| :--- | :--- | :--- | :--- |
| 1 | [Stress and Strain](unit-1.html) | Elastic constants, composite bars, temperature stresses, the stress–strain curve | Available |
| 2 | [Shear Force & Bending Moment](unit-2.html) | Reactions, SFD and BMD for determinate beams, contraflexure, internal hinges | Available |
| 3 | [Bending & Shear Stresses](unit-3.html) | Simple bending theory, moment of inertia, section modulus, shear distribution, composite beams | Available |
| 4 | [Slope and Deflection of Beams](unit-4.html) | Elastic curve, boundary conditions, double integration, Macaulay's method, moment-area, superposition | Available |
| 5 | Torsion of Circular Sections | Solid and hollow shafts, torsional shear stress, angle of twist, power transmission, combined loading | In progress |
| 6 | Combined Direct & Bending Stresses | Eccentric loading, extreme fibre stresses, stress distribution, the middle-third rule | Planned |

Each unit is **26 modules** and takes roughly **10–14 hours** of study. Work through them in order.

## What is inside every unit

- **Virtual laboratory** — a working solver, not an animation. Change the span, section or load and every number recomputes.
- **Worked problems** — twenty solved numericals per unit, graded Easy to GATE, with every line of arithmetic shown.
- **Seven levels of testing** — MCQ, fill-in-the-blanks, true/false, matching, numerical, a case study and an adaptive quiz.
- **Printable formula sheet** — one page per unit, laid out for revision and ready to print or save as PDF.
- **Progress tracking** — modules visited, minutes studied and quiz scores, with a resume link on the home page.
- **Certificate** — generated once a unit is completed.

## For students

Your progress and quiz scores are stored in **this browser on this device only** using `localStorage`. Nothing is uploaded anywhere. Scores will not follow you to another computer, and a private/incognito window keeps no record. If your teacher asks for your record, export it as CSV from Module 26.

Once a unit has loaded it continues to work offline.

## For teachers

Each unit is one self-contained HTML file. Copy it to a shared drive, a USB stick or the college LMS — no server or installation is needed. Module 26 collects the CSV records students export and reports the class average.

Because the files are plain HTML, you can also edit question text, load values or material properties directly with any text editor.

## Running it locally

Clone the repository and open `index.html` in a browser — that is enough for everything to work.

```bash
git clone https://github.com/mdaipayan/Strength-of-Material.git
cd Strength-of-Material
```

If your browser restricts `localStorage` on `file://` URLs, serve the folder over HTTP so progress saving works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tech notes

- Plain static HTML — no framework, no bundler, no dependencies to install.
- [Tailwind CSS](https://tailwindcss.com/) via CDN, [Font Awesome 6.4](https://fontawesome.com/) for icons, Google Fonts (Bitter, Inter, JetBrains Mono).
- Light/dark theme, shared across all units through `localStorage`.
- Accessibility: skip links, `:focus-visible` outlines, ARIA labels, a `<noscript>` fallback unit list, and `prefers-reduced-motion` support.
- Internet access is needed on first load for the CDN assets; after that the page runs from cache.

## Repository layout

```
index.html                          Landing page — syllabus, progress ring, resume link
unit-1.html … unit-4.html           One self-contained unit per file (26 modules each)
Photo.jpg                           Author photo
LICENSE                             MIT
.github/workflows/                  GitHub Pages deployment
```

## Contributing

Corrections to the physics, the arithmetic in a worked example or an answer key are especially welcome. Please open an issue quoting the unit and module number, or send a pull request.

## License

Released under the [MIT License](LICENSE) — free to copy, adapt and redistribute, including for classroom use, with attribution.

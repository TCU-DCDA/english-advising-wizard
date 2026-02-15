# Engelina — TCU English Department Advising Wizard

An interactive web application for TCU English Department students to track degree requirements, plan their courses, and visualize prerequisites.

## Features

- **Requirements Checklist**: Track completed courses with interactive checkboxes and progress visualization
- **4-Year Plans**: Semester-by-semester suggested course sequences
- **Prerequisite Mapping**: Visual course sequence chains

## Majors Covered

| Major | Total Hours | Max Lower-Division |
|-------|-------------|-------------------|
| English | 33 hrs | 9 hrs |
| Writing & Rhetoric | 33 hrs | 9 hrs (12 for Fall 2025 declares) |
| Creative Writing | 33 hrs | 3 hrs |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (includes manifest generation)
npm run build

# Preview production build
npm run preview
```

## Integration: AddRan Advising Ecosystem

This wizard is a **producer** in the hub-and-spoke advising ecosystem. It publishes an advising manifest consumed by [Sandra](https://github.com/TCU-DCDA/addran-advisor-chat) (the AddRan chatbot).

### Manifest generation
```bash
# Generate manifest only
npm run generate-manifest
```

The `build` script runs manifest generation automatically before `vite build`.

### Key files
| File | Purpose |
|---|---|
| `scripts/generate-manifest.js` | Reads `src/data/*.json`, produces `public/manifest.json` |
| `schemas/manifest.schema.json` | Schema v1.0 (source of truth for all wizards) |
| `public/manifest.json` | Generated output — 3 programs |
| `src/data/contacts.json` | Department contacts |
| `src/data/career-options.json` | Career paths per major |

### Schema governance
- This repo holds the **source of truth** schema at `schemas/manifest.schema.json`
- Other wizards and Sandra copy this schema and CI-check their version against it
- See [`INTEGRATION_EXECUTION_PLAN.md`](INTEGRATION_EXECUTION_PLAN.md) for full integration spec

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React Icons

## Data Source

Course requirements are based on TCU English Department advising grids (Spring 2026).
Official advising page: https://addran.tcu.edu/english/academics/advising/

## Maintenance Notes

- **Updating Requirements:** Edit `src/data/programs.json` to adjust categories, courses, or credit hours.
- **Updating Contacts/Careers:** Edit `src/data/contacts.json` and `src/data/career-options.json`, then run `npm run generate-manifest`.

## License

Private / TCU Internal Use.

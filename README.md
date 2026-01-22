# TCU English Department - Academic Advising Program

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

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Push this code to the repository
3. Go to **Settings** → **Pages**
4. Under "Build and deployment", select **GitHub Actions**
5. The site will automatically deploy on push to `main`

**Important**: Update `vite.config.js` with your repository name:
```js
base: '/your-repo-name/',
```

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React Icons

## Data Source

Course requirements are based on TCU English Department advising grids (Spring 2026).
Official advising page: https://addran.tcu.edu/english/academics/advising/

---

*This tool is for planning purposes only. Always verify requirements with your academic advisor.*

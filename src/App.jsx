import React, { useState, useMemo } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronRight, BookOpen, PenTool, FileText, Calendar, GitBranch, Info, AlertCircle, GraduationCap, Download, Printer } from 'lucide-react';

// ============================================
// TCU ENGLISH DEPARTMENT ADVISING PROGRAM
// Covers: English, Writing & Rhetoric, Creative Writing
// ============================================

// Course data for all three majors
const COURSE_DATA = {
  english: {
    name: "English",
    totalHours: 33,
    maxLowerDivision: 9,
    description: "The English major focuses on literature, literary theory, and cultural studies across American, British, and global traditions.",
    requirements: {
      americanLit: {
        name: "American Literature",
        hours: 6,
        courses: [
          { code: "ENGL 30133", title: "American Lit to 1865", hours: 3 },
          { code: "ENGL 30593", title: "American Fiction, 1960 to Present", hours: 3 },
          { code: "ENGL 30693", title: "U.S. Multi-Ethnic Literature", hours: 3 },
          { code: "ENGL 38023", title: "Research Seminar in American Lit", hours: 3 },
        ]
      },
      britishLit: {
        name: "British Literature",
        hours: 6,
        courses: [
          { code: "ENGL 30653", title: "Jane Austen: Novels & Films", hours: 3 },
          { code: "ENGL 30673", title: "King Arthur: Lit & Legend", hours: 3 },
          { code: "ENGL 40473", title: "Milton and His Contemporaries", hours: 3 },
        ]
      },
      globalLit: {
        name: "Global & Diasporic Literature",
        hours: 3,
        courses: [
          { code: "ENGL 30693", title: "U.S. Multi-Ethnic Literature", hours: 3 },
          { code: "ENGL 38023", title: "Research Seminar in American Lit", hours: 3 },
        ]
      },
      writing: {
        name: "Writing",
        hours: 3,
        courses: [
          { code: "CRWT 30343", title: "Fiction Writing Workshop I", hours: 3 },
          { code: "CRWT 30373", title: "Drama Writing Workshop I", hours: 3 },
          { code: "CRWT 40203", title: "Fiction Writing Workshop II", hours: 3 },
          { code: "CRWT 40703", title: "Advanced Multi-Genre Workshop", hours: 3 },
          { code: "WRIT 40563", title: "Multimedia Authoring: Sound & Podcast", hours: 3 },
          { code: "ENGL 50233", title: "Studies in Creative Writing", hours: 3 },
        ]
      },
      theory: {
        name: "Theory",
        hours: 3,
        courses: [
          { code: "ENGL 30103", title: "Intro to Literary Theory", hours: 3 },
          { code: "ENGL 30803", title: "Theories of Cinema", hours: 3 },
          { code: "WRIT 30243", title: "Rhetorical Practices in Culture", hours: 3 },
          { code: "WRIT 40333", title: "Language, Rhetoric & Culture", hours: 3 },
          { code: "WRIT 40373", title: "Rhetoric of Revolution", hours: 3 },
        ]
      },
      electives: {
        name: "Electives",
        hours: 12,
        note: "No more than 9 hours of lower-division courses total",
        courses: [
          { code: "ANY", title: "Any ENGL, WRIT, or CRWT class", hours: 3 },
          { code: "WRIT 30390", title: "Publication Production (3 credits total)", hours: 3 },
          { code: "ENGL 40003", title: "Honors Thesis Seminar II", hours: 3 },
          { code: "ENGL 40013", title: "Distinction Program: Thesis II", hours: 3 },
        ]
      }
    },
    overlays: {
      earlyLit: {
        name: "Early Literature & Culture",
        hours: 6,
        courses: [
          { code: "ENGL 30673", title: "King Arthur: Lit & Legend", hours: 3 },
          { code: "ENGL 40473", title: "Milton and His Contemporaries", hours: 3 },
        ]
      },
      juniorSeminar: {
        name: "Junior Research Seminar",
        hours: 3,
        courses: [
          { code: "ENGL 38023", title: "Research Seminar in American Lit", hours: 3 },
        ]
      }
    }
  },

  writing: {
    name: "Writing & Rhetoric",
    totalHours: 33,
    maxLowerDivision: 9,
    note: "Students who declared Fall 2025 may count 12 lower-division hours",
    description: "The Writing & Rhetoric major prepares students for careers in professional writing, digital media, and communication.",
    requirements: {
      writingPublishing: {
        name: "Writing & Publishing",
        hours: 3,
        courses: [
          { code: "WRIT 20113", title: "Technical and Professional Writing", hours: 3, level: "lower" },
          { code: "WRIT 20323", title: "Introduction to Multimedia Authoring", hours: 3, level: "lower" },
          { code: "WRIT 30213", title: "Advanced Composition: Writing Genres", hours: 3 },
          { code: "WRIT 30223", title: "Advanced Technical Writing", hours: 3 },
          { code: "WRIT 30263", title: "Style", hours: 3 },
          { code: "WRIT 30273", title: "Argument and Persuasion", hours: 3 },
          { code: "WRIT 30390", title: "Publication Production (3 credits total)", hours: 3 },
          { code: "WRIT 40233", title: "Writing for Publication", hours: 3 },
          { code: "WRIT 40243", title: "Advanced Professional Writing", hours: 3 },
          { code: "WRIT 40283", title: "Editing and Publishing", hours: 3 },
        ]
      },
      rhetoricsCultures: {
        name: "Rhetorics & Cultures",
        hours: 6,
        courses: [
          { code: "WRIT 20313", title: "Power & Protest", hours: 3, level: "lower" },
          { code: "WRIT 20343", title: "The Rhetoric of Science", hours: 3, level: "lower" },
          { code: "WRIT 20353", title: "Black Rhetoric and Language", hours: 3, level: "lower" },
          { code: "WRIT 30203", title: "Urban Rhetorics", hours: 3 },
          { code: "WRIT 30243", title: "Rhetorical Practices in Culture", hours: 3 },
          { code: "WRIT 30253", title: "Rhetorical Traditions", hours: 3 },
          { code: "WRIT 30293", title: "Non-Human Rhetoric and Representation", hours: 3 },
          { code: "WRIT 30613", title: "Writing Cross-culture Differences", hours: 3 },
          { code: "WRIT 30623", title: "Rhetorics of American Identities", hours: 3 },
          { code: "WRIT 30663", title: "Women's Rhetorics", hours: 3 },
          { code: "WRIT 40253", title: "Propaganda Analysis & Persuasion", hours: 3 },
          { code: "WRIT 40333", title: "Language, Rhetoric, & Culture", hours: 3 },
          { code: "WRIT 40373", title: "The Rhetoric of Revolution", hours: 3 },
          { code: "ENGL 30803", title: "Theories of Cinema", hours: 3 },
        ]
      },
      digitalRhetorics: {
        name: "Digital Rhetorics & Design",
        hours: 3,
        courses: [
          { code: "WRIT 20303", title: "Writing Games", hours: 3, level: "lower" },
          { code: "WRIT 20333", title: "Language, Technology and Society", hours: 3, level: "lower" },
          { code: "WRIT 20833", title: "Intro to Coding in the Humanities", hours: 3, level: "lower" },
          { code: "ENGL 20813", title: "Introduction to the Digital Humanities", hours: 3, level: "lower" },
          { code: "WRIT 30283", title: "Cyberliteracy", hours: 3 },
          { code: "WRIT 30603", title: "Rhetoric of Social Media", hours: 3 },
          { code: "WRIT 30893", title: "Digital Inclusiveness", hours: 3 },
          { code: "WRIT 40163", title: "Multimedia Author: Image & Hypertext", hours: 3 },
          { code: "WRIT 40263", title: "Multimedia Authoring: Animation & Film", hours: 3 },
          { code: "WRIT 40363", title: "Multimedia Authoring: Mobile Apps & eBooks", hours: 3 },
          { code: "WRIT 40463", title: "Multimed Author: Comics Production", hours: 3 },
          { code: "WRIT 40563", title: "Multimedia Authoring: Sound & Podcasting", hours: 3 },
        ]
      },
      internship: {
        name: "Writing Internship",
        hours: 3,
        courses: [
          { code: "WRIT 40273", title: "Writing Internship", hours: 3 },
        ]
      },
      juniorSeminar: {
        name: "Junior Writing Major Seminar",
        hours: 3,
        courses: [
          { code: "WRIT 38063", title: "Writing Major Seminar", hours: 3 },
        ]
      },
      electives: {
        name: "Electives (ENGL, WRIT, CRWT)",
        hours: 12,
        courses: [
          { code: "ANY", title: "Any ENGL, WRIT, or CRWT class", hours: 3 },
          { code: "ENGL 20803", title: "Intermed Comp: Writing Argument (Fall 2025 declares only)", hours: 3, level: "lower" },
        ]
      }
    }
  },

  creativeWriting: {
    name: "Creative Writing",
    totalHours: 33,
    maxLowerDivision: 3,
    description: "The Creative Writing major develops skills in fiction, poetry, creative nonfiction, and drama through workshop-based instruction.",
    requirements: {
      prerequisite: {
        name: "Prerequisite",
        hours: 3,
        courses: [
          { code: "CRWT 10203", title: "Intro to Creative Writing", hours: 3, level: "lower" },
          { code: "CRWT 20103", title: "Reading as a Writer", hours: 3, level: "lower" },
          { code: "CRWT 20133", title: "Writing for Performance", hours: 3, level: "lower" },
        ]
      },
      upperDivisionCW: {
        name: "Upper Division Creative Writing",
        hours: 12,
        courses: [
          { code: "CRWT 30233", title: "Creative Nonfiction Workshop I", hours: 3 },
          { code: "CRWT 30343", title: "Fiction Writing Workshop I", hours: 3 },
          { code: "CRWT 30353", title: "Poetry Writing Workshop I", hours: 3 },
          { code: "CRWT 30363", title: "Digital Creative Writing", hours: 3 },
          { code: "CRWT 30373", title: "Drama Writing Workshop I", hours: 3 },
          { code: "CRWT 40133", title: "Creative Nonfiction Workshop II", hours: 3 },
          { code: "CRWT 40203", title: "Fiction Writing Workshop II", hours: 3 },
          { code: "CRWT 40213", title: "Poetry Writing Workshop II", hours: 3 },
          { code: "CRWT 40223", title: "Drama Writing Workshop II", hours: 3 },
          { code: "CRWT 40703", title: "Advanced Multi-Genre Workshop", hours: 3 },
          { code: "CRWT 40803", title: "Advanced Literary Forms", hours: 3 },
          { code: "ENGL 50233", title: "Studies in Creative Writing", hours: 3 },
        ]
      },
      advancedSeminar: {
        name: "Advanced Creative Writing Seminar",
        hours: 3,
        courses: [
          { code: "CRWT 40703", title: "Advanced Multi-Genre Workshop", hours: 3 },
          { code: "CRWT 40803", title: "Advanced Literary Forms", hours: 3 },
          { code: "ENGL 50233", title: "Studies in Creative Writing", hours: 3 },
        ]
      },
      internship: {
        name: "Internship",
        hours: 3,
        courses: [
          { code: "WRIT 30390", title: "Publication Production (3 credits total)", hours: 3 },
          { code: "WRIT 40273", title: "Writing Internship", hours: 3 },
        ]
      },
      englElectives: {
        name: "Upper-Division ENGL Electives",
        hours: 6,
        courses: [
          { code: "ENGL 30103", title: "Intro to Literary Theory", hours: 3 },
          { code: "ENGL 30133", title: "American Lit to 1865", hours: 3 },
          { code: "ENGL 30593", title: "American Fiction, 1960 to the Present", hours: 3 },
          { code: "ENGL 30653", title: "Jane Austen: Novels and Films", hours: 3 },
          { code: "ENGL 30673", title: "King Arthur in Literature & Legend", hours: 3 },
          { code: "ENGL 30693", title: "U.S. Multi-Ethnic Literature", hours: 3 },
          { code: "ENGL 30803", title: "Theories of Cinema", hours: 3 },
          { code: "ENGL 40473", title: "Milton and his Contemporaries", hours: 3 },
        ]
      },
      writElectives: {
        name: "Upper-Division WRIT Electives",
        hours: 6,
        courses: [
          { code: "WRIT 30243", title: "Rhetorical Practice in Culture – Global Rhetorics", hours: 3 },
          { code: "WRIT 40333", title: "Language, Rhetoric, & Culture", hours: 3 },
          { code: "WRIT 40373", title: "The Rhetoric of Revolution", hours: 3 },
          { code: "WRIT 40563", title: "Multimedia Authoring: Sound & Podcast", hours: 3 },
        ]
      }
    }
  }
};

// Prerequisite chains for visualization
const PREREQUISITES = {
  "CRWT 30343": ["CRWT 10203", "CRWT 20103", "CRWT 20133"],
  "CRWT 30353": ["CRWT 10203", "CRWT 20103", "CRWT 20133"],
  "CRWT 30233": ["CRWT 10203", "CRWT 20103", "CRWT 20133"],
  "CRWT 30373": ["CRWT 10203", "CRWT 20103", "CRWT 20133"],
  "CRWT 40203": ["CRWT 30343"],
  "CRWT 40213": ["CRWT 30353"],
  "CRWT 40133": ["CRWT 30233"],
  "CRWT 40223": ["CRWT 30373"],
  "CRWT 40703": ["CRWT 30343", "CRWT 30353", "CRWT 30233", "CRWT 30373"],
  "ENGL 38023": ["ENGL 20803"],
  "WRIT 40273": ["WRIT 38063"],
  "WRIT 30390": [],
  "WRIT 40233": ["WRIT 20113"],
  "WRIT 40243": ["WRIT 20113"],
};

// Sample 4-year plans
const FOUR_YEAR_PLANS = {
  english: {
    year1: {
      fall: [
        { code: "ENGL 10803", title: "Intro to Literature", hours: 3, note: "TCU Core" },
        { code: "ENGL 20803", title: "Writing Arguments", hours: 3, note: "TCU Core/Prereq" },
      ],
      spring: [
        { code: "ENGL 20XX", title: "Lower-Division Elective", hours: 3 },
        { code: "ENGL 20XX", title: "Lower-Division Elective", hours: 3 },
      ]
    },
    year2: {
      fall: [
        { code: "ENGL 30133", title: "American Lit to 1865", hours: 3, category: "American Lit" },
        { code: "ENGL 30103", title: "Intro to Literary Theory", hours: 3, category: "Theory" },
      ],
      spring: [
        { code: "ENGL 30673", title: "King Arthur: Lit & Legend", hours: 3, category: "British Lit / Early Lit" },
        { code: "ENGL 30693", title: "U.S. Multi-Ethnic Literature", hours: 3, category: "American Lit / Global" },
      ]
    },
    year3: {
      fall: [
        { code: "ENGL 30653", title: "Jane Austen: Novels & Films", hours: 3, category: "British Lit" },
        { code: "ENGL 38023", title: "Research Seminar in American Lit", hours: 3, category: "Junior Seminar" },
      ],
      spring: [
        { code: "ENGL 40473", title: "Milton and His Contemporaries", hours: 3, category: "Early Lit" },
        { code: "CRWT 30343", title: "Fiction Writing Workshop I", hours: 3, category: "Writing" },
      ]
    },
    year4: {
      fall: [
        { code: "ENGL 30XX", title: "Upper-Division Elective", hours: 3, category: "Elective" },
        { code: "ENGL 30XX", title: "Upper-Division Elective", hours: 3, category: "Elective" },
      ],
      spring: [
        { code: "ENGL 40XX", title: "Upper-Division Elective", hours: 3, category: "Elective" },
        { code: "ENGL 40XX", title: "Upper-Division Elective", hours: 3, category: "Elective" },
      ]
    }
  },
  writing: {
    year1: {
      fall: [
        { code: "ENGL 10803", title: "Intro to Literature", hours: 3, note: "TCU Core" },
        { code: "WRIT 20113", title: "Technical and Professional Writing", hours: 3, category: "Writing & Publishing" },
      ],
      spring: [
        { code: "WRIT 20313", title: "Power & Protest", hours: 3, category: "Rhetorics & Cultures" },
        { code: "WRIT 20323", title: "Intro to Multimedia Authoring", hours: 3, category: "Digital Rhetorics" },
      ]
    },
    year2: {
      fall: [
        { code: "WRIT 30243", title: "Rhetorical Practices in Culture", hours: 3, category: "Rhetorics & Cultures" },
        { code: "WRIT 30283", title: "Cyberliteracy", hours: 3, category: "Digital Rhetorics" },
      ],
      spring: [
        { code: "WRIT 30213", title: "Advanced Composition: Writing Genres", hours: 3, category: "Writing & Publishing" },
        { code: "WRIT 30XX", title: "Elective", hours: 3, category: "Elective" },
      ]
    },
    year3: {
      fall: [
        { code: "WRIT 38063", title: "Writing Major Seminar", hours: 3, category: "Junior Seminar" },
        { code: "WRIT 40333", title: "Language, Rhetoric, & Culture", hours: 3, category: "Rhetorics & Cultures" },
      ],
      spring: [
        { code: "WRIT 40273", title: "Writing Internship", hours: 3, category: "Internship" },
        { code: "WRIT 40XX", title: "Elective", hours: 3, category: "Elective" },
      ]
    },
    year4: {
      fall: [
        { code: "WRIT 40563", title: "Multimedia Authoring: Sound & Podcasting", hours: 3, category: "Digital Rhetorics" },
        { code: "WRIT 40XX", title: "Elective", hours: 3, category: "Elective" },
      ],
      spring: [
        { code: "ENGL 30XX", title: "Elective", hours: 3, category: "Elective" },
        { code: "CRWT 30XX", title: "Elective", hours: 3, category: "Elective" },
      ]
    }
  },
  creativeWriting: {
    year1: {
      fall: [
        { code: "ENGL 10803", title: "Intro to Literature", hours: 3, note: "TCU Core" },
        { code: "CRWT 10203", title: "Intro to Creative Writing", hours: 3, category: "Prerequisite" },
      ],
      spring: [
        { code: "CRWT 20103", title: "Reading as a Writer", hours: 3, category: "Prerequisite (alternate)" },
        { code: "ENGL 20XX", title: "Lower-Division Lit", hours: 3 },
      ]
    },
    year2: {
      fall: [
        { code: "CRWT 30343", title: "Fiction Writing Workshop I", hours: 3, category: "Upper Division CW" },
        { code: "ENGL 30103", title: "Intro to Literary Theory", hours: 3, category: "ENGL Elective" },
      ],
      spring: [
        { code: "CRWT 30353", title: "Poetry Writing Workshop I", hours: 3, category: "Upper Division CW" },
        { code: "WRIT 30243", title: "Rhetorical Practice in Culture", hours: 3, category: "WRIT Elective" },
      ]
    },
    year3: {
      fall: [
        { code: "CRWT 40203", title: "Fiction Writing Workshop II", hours: 3, category: "Upper Division CW" },
        { code: "ENGL 30693", title: "U.S. Multi-Ethnic Literature", hours: 3, category: "ENGL Elective" },
      ],
      spring: [
        { code: "CRWT 30233", title: "Creative Nonfiction Workshop I", hours: 3, category: "Upper Division CW" },
        { code: "WRIT 40333", title: "Language, Rhetoric, & Culture", hours: 3, category: "WRIT Elective" },
      ]
    },
    year4: {
      fall: [
        { code: "CRWT 40703", title: "Advanced Multi-Genre Workshop", hours: 3, category: "Advanced Seminar" },
        { code: "WRIT 30390", title: "Publication Production", hours: 3, category: "Internship" },
      ],
      spring: [
        { code: "WRIT 30390", title: "Publication Production (cont.)", hours: 0, note: "Continue from Fall" },
        { code: "ENGL 30XX", title: "Upper-Division ENGL", hours: 3, category: "ENGL Elective" },
      ]
    }
  }
};

// ============================================
// EXPORT FUNCTION
// ============================================

function generatePDFReport(majorData, completedCourses, studentName = '') {
  // Calculate progress for each category
  const categoryProgress = {};
  let totalCompleted = 0;

  Object.entries(majorData.requirements).forEach(([key, cat]) => {
    const completed = cat.courses.filter(c => completedCourses.includes(c.code));
    const hoursCompleted = completed.reduce((sum, c) => sum + c.hours, 0);
    categoryProgress[key] = {
      name: cat.name,
      hoursRequired: cat.hours,
      hoursCompleted: Math.min(hoursCompleted, cat.hours),
      courses: completed
    };
    totalCompleted += Math.min(hoursCompleted, cat.hours);
  });

  const progress = Math.round((totalCompleted / majorData.totalHours) * 100);
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate HTML for print
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TCU English Department - Advising Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Georgia, 'Times New Roman', serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #1f2937;
          line-height: 1.5;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #581c87;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #581c87;
          font-size: 24px;
          margin-bottom: 5px;
        }
        .header h2 {
          font-size: 18px;
          font-weight: normal;
          color: #6b7280;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 15px;
          background: #f3f4f6;
          border-radius: 8px;
        }
        .meta-item { text-align: center; }
        .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .meta-value { font-size: 18px; font-weight: bold; color: #581c87; }
        .progress-section {
          margin-bottom: 30px;
          padding: 20px;
          border: 2px solid #581c87;
          border-radius: 8px;
        }
        .progress-bar-container {
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #581c87, #7c3aed);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        .category {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background: #f9fafb;
          border-left: 4px solid #581c87;
          margin-bottom: 10px;
        }
        .category-name { font-weight: bold; }
        .category-progress {
          font-size: 14px;
          color: #6b7280;
        }
        .category-complete { color: #059669; }
        .course-list {
          padding-left: 20px;
          margin-left: 15px;
          border-left: 2px solid #e5e7eb;
        }
        .course {
          padding: 8px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .course-check {
          width: 16px;
          height: 16px;
          border: 2px solid #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #059669;
          color: white;
          font-size: 10px;
        }
        .course-code {
          font-family: 'Courier New', monospace;
          color: #581c87;
          font-size: 13px;
        }
        .course-title { color: #374151; }
        .no-courses {
          color: #9ca3af;
          font-style: italic;
          padding: 10px 0;
          padding-left: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
        .signature-line {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        .signature {
          width: 45%;
          border-top: 1px solid #1f2937;
          padding-top: 5px;
          font-size: 12px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TCU English Department</h1>
        <h2>${majorData.name} Major - Advising Report</h2>
      </div>

      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Student</div>
          <div class="meta-value">${studentName || '_______________'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date</div>
          <div class="meta-value">${today}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Hours Completed</div>
          <div class="meta-value">${totalCompleted} / ${majorData.totalHours}</div>
        </div>
      </div>

      <div class="progress-section">
        <strong>Overall Progress</strong>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${Math.max(progress, 10)}%">
            ${progress}%
          </div>
        </div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
          ${totalCompleted} of ${majorData.totalHours} credit hours completed toward major
        </div>
      </div>

      <h3 style="margin-bottom: 15px; color: #581c87;">Completed Courses by Category</h3>

      ${Object.entries(categoryProgress).map(([key, cat]) => `
        <div class="category">
          <div class="category-header">
            <span class="category-name">${cat.name}</span>
            <span class="category-progress ${cat.hoursCompleted >= cat.hoursRequired ? 'category-complete' : ''}">
              ${cat.hoursCompleted} / ${cat.hoursRequired} hrs
              ${cat.hoursCompleted >= cat.hoursRequired ? ' ✓' : ''}
            </span>
          </div>
          ${cat.courses.length > 0 ? `
            <div class="course-list">
              ${cat.courses.map(c => `
                <div class="course">
                  <span class="course-check">✓</span>
                  <span class="course-code">${c.code}</span>
                  <span class="course-title">${c.title}</span>
                </div>
              `).join('')}
            </div>
          ` : '<div class="no-courses">No courses completed in this category</div>'}
        </div>
      `).join('')}

      <div class="signature-line">
        <div class="signature">Student Signature</div>
        <div class="signature">Advisor Signature</div>
      </div>

      <div class="footer">
        <p>TCU English Department • ${today}</p>
        <p>This report is for planning purposes only. Verify all requirements with your academic advisor.</p>
        <p>Official advising page: addran.tcu.edu/english/academics/advising/</p>
      </div>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();

  // Auto-trigger print dialog after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// ============================================
// COMPONENTS
// ============================================

// Progress Ring Component
function ProgressRing({ progress, size = 80, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-purple-900/50"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-white transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// Requirement Category Component
function RequirementCategory({ category, completedCourses, onToggleCourse, isExpanded, onToggleExpand }) {
  const completedInCategory = category.courses.filter(c => completedCourses.includes(c.code)).length;
  const hoursCompleted = category.courses.filter(c => completedCourses.includes(c.code)).reduce((sum, c) => sum + c.hours, 0);
  const isComplete = hoursCompleted >= category.hours;

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={onToggleExpand}
        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
          isComplete ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <span className="font-medium text-gray-900">{category.name}</span>
            <span className="ml-2 text-sm text-gray-500">
              ({hoursCompleted}/{category.hours} hrs)
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-white">
          {category.note && (
            <div className="mb-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {category.note}
            </div>
          )}
          <div className="space-y-2">
            {category.courses.map(course => (
              <label
                key={course.code}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={completedCourses.includes(course.code)}
                  onChange={() => onToggleCourse(course.code)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="font-mono text-sm text-purple-700">{course.code}</span>
                  <span className="ml-2 text-gray-700">{course.title}</span>
                  {course.level === 'lower' && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                      Lower Division
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">{course.hours} hrs</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Requirements Checklist Tab
function RequirementsChecklist({ major, completedCourses, onToggleCourse }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['americanLit', 'writingPublishing', 'prerequisite']));
  const majorData = COURSE_DATA[major];

  const toggleCategory = (key) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCategories(newExpanded);
  };

  const totalCompleted = useMemo(() => {
    let hours = 0;
    Object.values(majorData.requirements).forEach(cat => {
      const catHours = cat.courses.filter(c => completedCourses.includes(c.code)).reduce((sum, c) => sum + c.hours, 0);
      hours += Math.min(catHours, cat.hours);
    });
    return hours;
  }, [completedCourses, majorData]);

  const progress = (totalCompleted / majorData.totalHours) * 100;

  return (
    <div>
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{majorData.name} Major</h2>
            <p className="text-purple-200 mt-1">{majorData.description}</p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="bg-purple-500/30 px-3 py-1 rounded-full">
                {majorData.totalHours} Total Hours Required
              </span>
              <span className="bg-purple-500/30 px-3 py-1 rounded-full">
                Max {majorData.maxLowerDivision} Lower-Division Hours
              </span>
            </div>
          </div>
          <ProgressRing progress={progress} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Core Requirements
          </h3>
          {Object.entries(majorData.requirements).map(([key, category]) => (
            <RequirementCategory
              key={key}
              category={category}
              completedCourses={completedCourses}
              onToggleCourse={onToggleCourse}
              isExpanded={expandedCategories.has(key)}
              onToggleExpand={() => toggleCategory(key)}
            />
          ))}
        </div>

        {majorData.overlays && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Overlay Requirements
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Overlay courses can count toward both requirements above AND the overlays below.
                </p>
              </div>
            </div>
            {Object.entries(majorData.overlays).map(([key, category]) => (
              <RequirementCategory
                key={key}
                category={category}
                completedCourses={completedCourses}
                onToggleCourse={onToggleCourse}
                isExpanded={expandedCategories.has(key)}
                onToggleExpand={() => toggleCategory(key)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Four-Year Plan Tab
function FourYearPlan({ major }) {
  const plan = FOUR_YEAR_PLANS[major];
  const majorData = COURSE_DATA[major];

  const years = ['year1', 'year2', 'year3', 'year4'];
  const yearLabels = ['Freshman Year', 'Sophomore Year', 'Junior Year', 'Senior Year'];

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          4-Year Plan: {majorData.name}
        </h2>
        <p className="text-blue-200 mt-1">
          Suggested semester-by-semester course sequence. Adjust based on course availability and your schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {years.map((year, idx) => (
          <div key={year} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">{yearLabels[idx]}</h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-200">
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Fall Semester</h4>
                <div className="space-y-3">
                  {plan[year].fall.map((course, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-mono text-sm text-purple-700">{course.code}</div>
                      <div className="text-sm text-gray-700 mt-1">{course.title}</div>
                      {course.category && (
                        <div className="text-xs text-blue-600 mt-1">{course.category}</div>
                      )}
                      {course.note && (
                        <div className="text-xs text-amber-600 mt-1">{course.note}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{course.hours} credit hours</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Spring Semester</h4>
                <div className="space-y-3">
                  {plan[year].spring.map((course, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-mono text-sm text-purple-700">{course.code}</div>
                      <div className="text-sm text-gray-700 mt-1">{course.title}</div>
                      {course.category && (
                        <div className="text-xs text-blue-600 mt-1">{course.category}</div>
                      )}
                      {course.note && (
                        <div className="text-xs text-amber-600 mt-1">{course.note}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{course.hours} credit hours</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Prerequisites Tab
function PrerequisiteMap({ major }) {
  const majorData = COURSE_DATA[major];

  // Get all courses for this major that have prerequisites
  const relevantCourses = useMemo(() => {
    const courses = [];
    Object.values(majorData.requirements).forEach(cat => {
      cat.courses.forEach(course => {
        if (PREREQUISITES[course.code]) {
          courses.push({
            ...course,
            prereqs: PREREQUISITES[course.code]
          });
        }
      });
    });
    return courses;
  }, [majorData]);

  // Build prerequisite chains for visualization
  const chains = useMemo(() => {
    const chainMap = {};

    // Creative Writing workshop chains
    if (major === 'creativeWriting' || major === 'english') {
      chainMap['Fiction'] = [
        { code: 'CRWT 10203', title: 'Intro to Creative Writing' },
        { code: 'CRWT 30343', title: 'Fiction Writing Workshop I' },
        { code: 'CRWT 40203', title: 'Fiction Writing Workshop II' },
        { code: 'CRWT 40703', title: 'Advanced Multi-Genre Workshop' },
      ];
      chainMap['Poetry'] = [
        { code: 'CRWT 10203', title: 'Intro to Creative Writing' },
        { code: 'CRWT 30353', title: 'Poetry Writing Workshop I' },
        { code: 'CRWT 40213', title: 'Poetry Writing Workshop II' },
      ];
      chainMap['Creative Nonfiction'] = [
        { code: 'CRWT 10203', title: 'Intro to Creative Writing' },
        { code: 'CRWT 30233', title: 'Creative Nonfiction Workshop I' },
        { code: 'CRWT 40133', title: 'Creative Nonfiction Workshop II' },
      ];
      chainMap['Drama'] = [
        { code: 'CRWT 10203', title: 'Intro to Creative Writing' },
        { code: 'CRWT 30373', title: 'Drama Writing Workshop I' },
        { code: 'CRWT 40223', title: 'Drama Writing Workshop II' },
      ];
    }

    if (major === 'writing') {
      chainMap['Professional Writing'] = [
        { code: 'WRIT 20113', title: 'Technical and Professional Writing' },
        { code: 'WRIT 40243', title: 'Advanced Professional Writing' },
      ];
      chainMap['Writing Major Sequence'] = [
        { code: 'WRIT 38063', title: 'Writing Major Seminar (Junior)' },
        { code: 'WRIT 40273', title: 'Writing Internship' },
      ];
    }

    if (major === 'english') {
      chainMap['Research Sequence'] = [
        { code: 'ENGL 20803', title: 'Writing Arguments' },
        { code: 'ENGL 38023', title: 'Research Seminar in American Lit' },
      ];
    }

    return chainMap;
  }, [major]);

  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-xl mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="w-6 h-6" />
          Prerequisite Map: {majorData.name}
        </h2>
        <p className="text-green-200 mt-1">
          Course sequences showing which classes must be taken before others.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(chains).map(([chainName, courses]) => (
          <div key={chainName} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">{chainName} Track</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {courses.map((course, idx) => (
                  <React.Fragment key={course.code}>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 min-w-48">
                      <div className="font-mono text-sm text-purple-700">{course.code}</div>
                      <div className="text-sm text-gray-700 mt-1">{course.title}</div>
                    </div>
                    {idx < courses.length - 1 && (
                      <div className="text-gray-400 text-2xl">→</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5" />
          Important Notes
        </h3>
        <ul className="text-sm text-amber-800 space-y-2">
          <li>• Workshop II courses require completion of Workshop I in the same genre</li>
          <li>• Advanced Multi-Genre Workshop requires at least one Workshop I course</li>
          <li>• Junior Seminar should be taken in the fall of junior year</li>
          <li>• Internship is typically taken after the Junior Seminar</li>
          <li>• Check with your advisor for any additional prerequisites or co-requisites</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function TCUEnglishAdvisingApp() {
  const [selectedMajor, setSelectedMajor] = useState('english');
  const [activeTab, setActiveTab] = useState('requirements');
  const [completedCourses, setCompletedCourses] = useState([]);

  const toggleCourse = (code) => {
    // Enforce prerequisites when adding a course
    if (!completedCourses.includes(code)) {
      const prereqs = PREREQUISITES[code];
      if (prereqs && prereqs.length > 0) {
        // Build readable list for alert
        const prereqList = prereqs.map(p => {
          // Find title mostly for better UX
          // Helper function to finding title could be useful but we iterate data
          return p;
        });
        
        const hasPrereq = prereqs.some(p => completedCourses.includes(p));
        
        if (!hasPrereq) {
          alert(`You must complete at least one of the following prerequisites before taking ${code}:\n\n${prereqList.join('\n')}`);
          return;
        }
      }
    }

    setCompletedCourses(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const majors = [
    { id: 'english', name: 'English', icon: BookOpen },
    { id: 'writing', name: 'Writing & Rhetoric', icon: PenTool },
    { id: 'creativeWriting', name: 'Creative Writing', icon: FileText },
  ];

  const tabs = [
    { id: 'requirements', name: 'Requirements', icon: CheckCircle },
    { id: 'plan', name: '4-Year Plan', icon: Calendar },
    { id: 'prerequisites', name: 'Prerequisites', icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <GraduationCap className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">TCU English Department</h1>
                <p className="text-purple-300">Academic Advising Program</p>
              </div>
            </div>
            <button
              onClick={() => generatePDFReport(COURSE_DATA[selectedMajor], completedCourses)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Major Selector */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-4">
            {majors.map(major => {
              const Icon = major.icon;
              return (
                <button
                  key={major.id}
                  onClick={() => setSelectedMajor(major.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMajor === major.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {major.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'requirements' && (
          <RequirementsChecklist
            major={selectedMajor}
            completedCourses={completedCourses}
            onToggleCourse={toggleCourse}
          />
        )}
        {activeTab === 'plan' && (
          <FourYearPlan major={selectedMajor} />
        )}
        {activeTab === 'prerequisites' && (
          <PrerequisiteMap major={selectedMajor} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-sm text-gray-600 text-center">
            TCU English Department Advising • Spring 2026 •
            <a href="https://addran.tcu.edu/english/academics/advising/" className="text-purple-600 hover:underline ml-1">
              Official Advising Page
            </a>
          </p>
          <p className="text-xs text-gray-500 text-center mt-2">
            This tool is for planning purposes only. Always verify requirements with your academic advisor.
          </p>
        </div>
      </footer>
    </div>
  );
}

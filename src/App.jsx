import React, { useState, useMemo } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronRight, BookOpen, PenTool, FileText, Calendar, GitBranch, Info, AlertCircle, GraduationCap, Download, Printer, Search, X } from 'lucide-react';
import { ALL_COURSES } from './allCourses';

// ============================================
// TCU ENGLISH DEPARTMENT ADVISING PROGRAM
// Covers: English, Writing & Rhetoric, Creative Writing
// ============================================

// Import data from extracted JSON files (Phase 1 refactoring)
import COURSE_DATA from './data/programs.json';
import PREREQUISITES from './data/prerequisites.json';
import FOUR_YEAR_PLANS from './data/four-year-plans.json';

// TCU Core WCO courses that don't count toward major hours
const TCU_CORE_COURSES = ['ENGL 10803', 'ENGL 20803'];

// ============================================
// EXPORT FUNCTION
// ============================================

function generatePDFReport(majorData, completedCourses, plannedCourses = [], futureCourses = {}, expectedGraduation = '', studentName = '') {
  // Calculate progress for each category
  const categoryProgress = {};
  let totalCompleted = 0;
  let totalPlanned = 0;
  let totalFuture = 0;

  const allFutureCourses = Object.values(futureCourses).flat();

  Object.entries(majorData.requirements).forEach(([key, cat]) => {
    const completed = cat.courses.filter(c => completedCourses.includes(c.code));
    const planned = cat.courses.filter(c => plannedCourses.includes(c.code));
    const future = cat.courses.filter(c => allFutureCourses.includes(c.code));

    const hoursCompleted = completed.reduce((sum, c) => sum + c.hours, 0);
    const hoursPlanned = planned.reduce((sum, c) => sum + c.hours, 0);
    const hoursFuture = future.reduce((sum, c) => sum + c.hours, 0);

    categoryProgress[key] = {
      name: cat.name,
      hoursRequired: cat.hours,
      hoursCompleted: Math.min(hoursCompleted, cat.hours),
      hoursPlanned: hoursPlanned,
      hoursFuture: hoursFuture,
      completedCourses: completed,
      plannedCourses: planned,
      futureCourses: future
    };
    totalCompleted += Math.min(hoursCompleted, cat.hours);
    totalPlanned += hoursPlanned;
    totalFuture += hoursFuture;
  });

  const progress = Math.round((totalCompleted / majorData.totalHours) * 100);
  const projectedProgress = Math.round(((totalCompleted + totalPlanned + totalFuture) / majorData.totalHours) * 100);
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
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f3f4f6;
          border-radius: 8px;
        }
        .meta-item { text-align: center; flex: 1; min-width: 120px; }
        .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
        .meta-value { font-size: 16px; font-weight: bold; color: #581c87; }
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
          position: relative;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #059669, #10b981);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        .progress-bar-projected {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          opacity: 0.5;
          border-radius: 12px;
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
        .category-progress { font-size: 14px; color: #6b7280; }
        .category-complete { color: #059669; }
        .course-list {
          padding-left: 20px;
          margin-left: 15px;
          border-left: 2px solid #e5e7eb;
        }
        .course {
          padding: 6px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .course-check {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }
        .course-check.completed { background: #059669; color: white; }
        .course-check.planned { background: #3b82f6; color: white; }
        .course-check.future { background: #f97316; color: white; }
        .course-code {
          font-family: 'Courier New', monospace;
          color: #581c87;
          font-size: 13px;
        }
        .course-title { color: #374151; }
        .course-status {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
        }
        .status-completed { background: #d1fae5; color: #059669; }
        .status-planned { background: #dbeafe; color: #2563eb; }
        .status-future { background: #ffedd5; color: #ea580c; }
        .no-courses {
          color: #9ca3af;
          font-style: italic;
          padding: 10px 0;
          padding-left: 20px;
        }
        .future-plan {
          margin-top: 30px;
          padding: 20px;
          border: 2px solid #f97316;
          border-radius: 8px;
          background: #fff7ed;
        }
        .future-plan h3 { color: #ea580c; margin-bottom: 15px; }
        .semester-block {
          margin-bottom: 15px;
          padding: 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #fed7aa;
        }
        .semester-title { font-weight: bold; color: #c2410c; margin-bottom: 8px; }
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
        .legend {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          font-size: 12px;
        }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
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
        ${expectedGraduation ? `
        <div class="meta-item">
          <div class="meta-label">Expected Graduation</div>
          <div class="meta-value">${expectedGraduation}</div>
        </div>
        ` : ''}
        <div class="meta-item">
          <div class="meta-label">Completed</div>
          <div class="meta-value">${totalCompleted} hrs</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Planned</div>
          <div class="meta-value">${totalPlanned + totalFuture} hrs</div>
        </div>
      </div>

      <div class="progress-section">
        <strong>Overall Progress</strong>
        <div class="progress-bar-container">
          <div class="progress-bar-projected" style="width: ${Math.min(projectedProgress, 100)}%"></div>
          <div class="progress-bar" style="width: ${Math.max(progress, 5)}%">
            ${progress}%
          </div>
        </div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
          ${totalCompleted} of ${majorData.totalHours} hours completed
          ${totalPlanned + totalFuture > 0 ? ` • ${totalPlanned + totalFuture} hours planned (${projectedProgress}% projected)` : ''}
        </div>
        <div class="legend">
          <div class="legend-item"><div class="legend-dot" style="background: #059669;"></div> Completed</div>
          <div class="legend-item"><div class="legend-dot" style="background: #3b82f6;"></div> Coming Semester</div>
          <div class="legend-item"><div class="legend-dot" style="background: #f97316;"></div> Future</div>
        </div>
      </div>

      <h3 style="margin-bottom: 15px; color: #581c87;">Courses by Category</h3>

      ${Object.entries(categoryProgress).map(([key, cat]) => `
        <div class="category">
          <div class="category-header">
            <span class="category-name">${cat.name}</span>
            <span class="category-progress ${cat.hoursCompleted >= cat.hoursRequired ? 'category-complete' : ''}">
              ${cat.hoursCompleted}/${cat.hoursRequired} hrs completed
              ${cat.hoursPlanned > 0 ? ` +${cat.hoursPlanned} planned` : ''}
              ${cat.hoursFuture > 0 ? ` +${cat.hoursFuture} future` : ''}
            </span>
          </div>
          ${cat.completedCourses.length > 0 || cat.plannedCourses.length > 0 || cat.futureCourses.length > 0 ? `
            <div class="course-list">
              ${cat.completedCourses.map(c => `
                <div class="course">
                  <span class="course-check completed">✓</span>
                  <span class="course-code">${c.code}</span>
                  <span class="course-title">${c.title}</span>
                  <span class="course-status status-completed">Completed</span>
                </div>
              `).join('')}
              ${cat.plannedCourses.map(c => `
                <div class="course">
                  <span class="course-check planned">→</span>
                  <span class="course-code">${c.code}</span>
                  <span class="course-title">${c.title}</span>
                  <span class="course-status status-planned">Coming Semester</span>
                </div>
              `).join('')}
              ${cat.futureCourses.map(c => `
                <div class="course">
                  <span class="course-check future">○</span>
                  <span class="course-code">${c.code}</span>
                  <span class="course-title">${c.title}</span>
                  <span class="course-status status-future">Future</span>
                </div>
              `).join('')}
            </div>
          ` : '<div class="no-courses">No courses scheduled for this category</div>'}
        </div>
      `).join('')}

      ${Object.keys(futureCourses).length > 0 && Object.values(futureCourses).some(arr => arr.length > 0) ? `
        <div class="future-plan">
          <h3>📅 Future Semester Plan</h3>
          ${Object.entries(futureCourses)
            .filter(([_, courses]) => courses.length > 0)
            .sort(([a], [b]) => {
              const [aSem, aYear] = a.split(' ');
              const [bSem, bYear] = b.split(' ');
              if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
              return aSem === 'Spring' ? -1 : 1;
            })
            .map(([semester, codes]) => {
              const semesterCourses = codes.map(code => {
                let found = null;
                Object.values(majorData.requirements).forEach(cat => {
                  const c = cat.courses.find(course => course.code === code);
                  if (c) found = c;
                });
                return found;
              }).filter(Boolean);
              const semesterHours = semesterCourses.reduce((sum, c) => sum + c.hours, 0);
              return `
                <div class="semester-block">
                  <div class="semester-title">${semester} (${semesterHours} hrs)</div>
                  ${semesterCourses.map(c => `
                    <div style="font-size: 13px; padding: 3px 0;">
                      <span style="font-family: monospace; color: #581c87;">${c.code}</span>
                      <span style="color: #374151;"> - ${c.title}</span>
                    </div>
                  `).join('')}
                </div>
              `;
            }).join('')}
        </div>
      ` : ''}

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

// Full Course Catalog Component for Step 1
function CatalogList({ completedCourses, onToggleCourse }) {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const groups = useMemo(() => {
    const WCO_COURSES = ['ENGL 10803', 'ENGL 20803']; // Writing Competencies (TCU Core)
    const g = { WCO: [], ENGL: [], CRWT: [], WRIT: [] };

    ALL_COURSES.forEach(c => {
       // Check if it's a WCO course first
       if (WCO_COURSES.includes(c.code)) {
         g.WCO.push(c);
       } else {
         const prefix = c.code.substring(0, 4);
         if (g[prefix]) g[prefix].push(c);
       }
    });
    return g;
  }, []);

  // Filter courses based on search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;

    const filtered = { WCO: [], ENGL: [], CRWT: [], WRIT: [] };
    const search = searchTerm.toLowerCase();

    Object.entries(groups).forEach(([prefix, courses]) => {
      filtered[prefix] = courses.filter(course =>
        course.code.toLowerCase().includes(search) ||
        course.title.toLowerCase().includes(search) ||
        course.description?.toLowerCase().includes(search)
      );
    });

    return filtered;
  }, [groups, searchTerm]);

  // Scroll to a specific section
  const scrollToSection = (prefix) => {
    const element = document.getElementById(`catalog-${prefix}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <button
        className="w-full flex items-center justify-between cursor-pointer focus:outline-none"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-600" />
          <span className="flex items-center gap-2">
            Full Course Catalog (Select all completed courses)
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded uppercase tracking-wide">
              Start Here
            </span>
          </span>
        </h3>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-600 mb-2">Check the boxes for any courses you have completed. These will be marked as completed across the entire degree plan.</p>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses by code, title, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Jump Menu */}
          {!searchTerm && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <span className="text-sm font-medium text-purple-900">Jump to:</span>
              {Object.keys(groups).map(prefix => (
                <button
                  key={prefix}
                  onClick={() => scrollToSection(prefix)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded transition-colors"
                >
                  {prefix}
                </button>
              ))}
            </div>
          )}

          {/* Search Results Count */}
          {searchTerm && (
            <div className="text-sm text-gray-600">
              Found {Object.values(filteredGroups).reduce((sum, courses) => sum + courses.length, 0)} courses matching "{searchTerm}"
            </div>
          )}

          {/* Course Groups */}
          {Object.entries(filteredGroups).map(([prefix, courses]) => {
             if (courses.length === 0) return null;

             const groupLabel = prefix === 'WCO'
               ? 'Writing Competencies (TCU Core)'
               : `${prefix} Courses`;

             return (
              <div key={prefix} id={`catalog-${prefix}`} className={`border rounded-lg p-3 scroll-mt-4 ${prefix === 'WCO' ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}`}>
                 <h4 className="font-bold text-gray-800 mb-2">
                   {groupLabel} ({courses.length})
                   {prefix === 'WCO' && <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded uppercase">Core</span>}
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                   {courses.map(course => {
                     const isCompleted = completedCourses.includes(course.code);
                     return (
                       <label key={course.code} className={`flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors ${isCompleted ? 'bg-green-50 ring-1 ring-green-200' : ''}`}>
                         <input
                           type="checkbox"
                           checked={isCompleted}
                           onChange={() => onToggleCourse(course.code)}
                           className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                         />
                         <div>
                           <div className="font-mono text-xs text-purple-700 font-bold">{course.code}</div>
                           <div className="text-sm text-gray-700 leading-tight">{course.title}</div>
                         </div>
                       </label>
                     );
                   })}
                 </div>
              </div>
             );
          })}

          {/* No Results */}
          {searchTerm && Object.values(filteredGroups).every(courses => courses.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No courses found matching "{searchTerm}"</p>
              <p className="text-xs mt-1">Try searching by course code (e.g., "ENGL 30133") or title (e.g., "American Literature")</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Requirement Category Component
function RequirementCategory({ category, completedCourses, plannedCourses = [], onToggleCourse, isExpanded, onToggleExpand, selectionStep = 1, allRequirements = {} }) {
  // Check if this is an elective category (has course with code "ANY")
  const isElectiveCategory = category.courses.some(c => c.code === 'ANY');

  let hoursCompleted, hoursPlanned;

  if (isElectiveCategory) {
    // For elective categories, count all ENGL/WRIT/CRWT courses that aren't already counted in other categories
    const coursesInOtherCategories = new Set();
    Object.entries(allRequirements).forEach(([key, reqCategory]) => {
      // Skip elective categories when building the exclusion list
      if (!reqCategory.courses.some(c => c.code === 'ANY')) {
        reqCategory.courses.forEach(c => {
          if (c.code !== 'ANY') {
            coursesInOtherCategories.add(c.code);
          }
        });
      }
    });

    // Count completed courses that aren't in other categories (and exclude TCU Core)
    hoursCompleted = completedCourses
      .filter(code => !coursesInOtherCategories.has(code) && !TCU_CORE_COURSES.includes(code))
      .reduce((sum, code) => {
        const course = ALL_COURSES.find(c => c.code === code);
        return sum + (course?.hours || 0);
      }, 0);

    // Count planned courses that aren't in other categories (and exclude TCU Core)
    hoursPlanned = plannedCourses
      .filter(code => !coursesInOtherCategories.has(code) && !TCU_CORE_COURSES.includes(code))
      .reduce((sum, code) => {
        const course = ALL_COURSES.find(c => c.code === code);
        return sum + (course?.hours || 0);
      }, 0);
  } else {
    // Normal category - count courses that match this category's course list
    hoursCompleted = category.courses.filter(c => completedCourses.includes(c.code)).reduce((sum, c) => sum + c.hours, 0);
    hoursPlanned = category.courses.filter(c => plannedCourses.includes(c.code)).reduce((sum, c) => sum + c.hours, 0);
  }

  const isComplete = hoursCompleted >= category.hours;
  const willBeComplete = (hoursCompleted + hoursPlanned) >= category.hours;

  // For elective categories, build the actual list of courses to display
  let coursesToDisplay = category.courses;
  if (isElectiveCategory) {
    const coursesInOtherCategories = new Set();
    Object.entries(allRequirements).forEach(([key, reqCategory]) => {
      if (!reqCategory.courses.some(c => c.code === 'ANY')) {
        reqCategory.courses.forEach(c => {
          if (c.code !== 'ANY') {
            coursesInOtherCategories.add(c.code);
          }
        });
      }
    });

    // Get all completed and planned courses that aren't in other categories (and exclude TCU Core)
    const electiveCoursesCodes = [...new Set([...completedCourses, ...plannedCourses])]
      .filter(code => !coursesInOtherCategories.has(code) && !TCU_CORE_COURSES.includes(code));

    // Map to full course objects from ALL_COURSES
    coursesToDisplay = electiveCoursesCodes
      .map(code => ALL_COURSES.find(c => c.code === code))
      .filter(c => c !== undefined);
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={onToggleExpand}
        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
          isComplete ? 'bg-green-50' : willBeComplete ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : willBeComplete ? (
            <Circle className="w-5 h-5 text-blue-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <span className="font-medium text-gray-900">{category.name}</span>
            <span className="ml-2 text-sm text-gray-500">
              ({hoursCompleted}/{category.hours} hrs completed)
            </span>
            {hoursPlanned > 0 && (
              <span className="ml-1 text-sm text-blue-600">
                +{hoursPlanned} planned
              </span>
            )}
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
            {coursesToDisplay.map(course => {
              const isCompleted = completedCourses.includes(course.code);
              const isPlanned = plannedCourses.includes(course.code);
              const isChecked = selectionStep === 1 ? isCompleted : isPlanned;
              const isDisabled = selectionStep === 2 && isCompleted; // Can't plan already completed

              return (
                <label
                  key={course.code}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                    isCompleted ? 'bg-green-50' : isPlanned ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => !isDisabled && onToggleCourse(course.code)}
                    disabled={isDisabled}
                    className={`w-4 h-4 rounded focus:ring-2 ${
                      selectionStep === 1
                        ? 'text-green-600 focus:ring-green-500'
                        : 'text-blue-600 focus:ring-blue-500'
                    }`}
                  />
                  <div className="flex-1">
                    <span className="font-mono text-sm text-purple-700">{course.code}</span>
                    <span className="ml-2 text-gray-700">{course.title}</span>
                    {course.level === 'lower' && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                        Lower Division
                      </span>
                    )}
                    {isCompleted && selectionStep === 2 && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                        ✓ Completed
                      </span>
                    )}
                    {isPlanned && selectionStep === 1 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Planned
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{course.hours} hrs</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Requirements Checklist Tab
function RequirementsChecklist({
  major,
  completedCourses,
  plannedCourses,
  futureCourses,
  onToggleCourse,
  onRemoveFutureCourse,
  selectionStep,
  onStepChange,
  expectedGraduation,
  onGraduationChange
}) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
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
      const isElectiveCategory = cat.courses.some(c => c.code === 'ANY');

      let catHours;
      if (isElectiveCategory) {
        // For elective categories, count all courses not in other specific categories
        const coursesInOtherCategories = new Set();
        Object.values(majorData.requirements).forEach(reqCat => {
          if (!reqCat.courses.some(c => c.code === 'ANY')) {
            reqCat.courses.forEach(c => {
              if (c.code !== 'ANY') {
                coursesInOtherCategories.add(c.code);
              }
            });
          }
        });

        catHours = completedCourses
          .filter(code => !coursesInOtherCategories.has(code) && !TCU_CORE_COURSES.includes(code))
          .reduce((sum, code) => {
            const course = ALL_COURSES.find(c => c.code === code);
            return sum + (course?.hours || 0);
          }, 0);
      } else {
        catHours = cat.courses.filter(c => completedCourses.includes(c.code)).reduce((sum, c) => sum + c.hours, 0);
      }

      hours += Math.min(catHours, cat.hours);
    });
    return hours;
  }, [completedCourses, majorData]);

  const totalPlanned = useMemo(() => {
    let hours = 0;
    Object.values(majorData.requirements).forEach(cat => {
      const isElectiveCategory = cat.courses.some(c => c.code === 'ANY');

      let catHours;
      if (isElectiveCategory) {
        // For elective categories, count all courses not in other specific categories
        const coursesInOtherCategories = new Set();
        Object.values(majorData.requirements).forEach(reqCat => {
          if (!reqCat.courses.some(c => c.code === 'ANY')) {
            reqCat.courses.forEach(c => {
              if (c.code !== 'ANY') {
                coursesInOtherCategories.add(c.code);
              }
            });
          }
        });

        catHours = plannedCourses
          .filter(code => !coursesInOtherCategories.has(code) && !TCU_CORE_COURSES.includes(code))
          .reduce((sum, code) => {
            const course = ALL_COURSES.find(c => c.code === code);
            return sum + (course?.hours || 0);
          }, 0);
      } else {
        catHours = cat.courses.filter(c => plannedCourses.includes(c.code)).reduce((sum, c) => sum + c.hours, 0);
      }

      hours += Math.min(catHours, cat.hours);
    });
    return hours;
  }, [plannedCourses, majorData]);

  const progress = (totalCompleted / majorData.totalHours) * 100;
  const projectedProgress = ((totalCompleted + totalPlanned) / majorData.totalHours) * 100;

  // Calculate lower-division hours (10000-29999 level courses, excluding TCU Core)
  const lowerDivisionHours = useMemo(() => {
    const allFutureCoursesFlat = Object.values(futureCourses || {}).flat();
    const allSelectedCourses = [...completedCourses, ...plannedCourses, ...allFutureCoursesFlat];
    return allSelectedCourses.reduce((total, code) => {
      // Exclude TCU Core courses from lower-division count
      if (TCU_CORE_COURSES.includes(code)) {
        return total;
      }
      const course = ALL_COURSES.find(c => c.code === code);
      if (course) {
        // Extract course number (e.g., "ENGL 10803" -> "10803")
        const match = code.match(/(\d{5})/);
        if (match) {
          const courseNum = parseInt(match[1]);
          // Lower-division is 10000-29999
          if (courseNum >= 10000 && courseNum < 30000) {
            return total + course.hours;
          }
        }
      }
      return total;
    }, 0);
  }, [completedCourses, plannedCourses, futureCourses]);

  // Determine lower-division status
  const lowerDivisionStatus = lowerDivisionHours <= majorData.maxLowerDivision ? 'ok'
    : lowerDivisionHours <= majorData.maxLowerDivision + 3 ? 'warning'
    : 'over';

  const semesterOptions = generateSemesterOptions();
  const allFutureCourses = Object.values(futureCourses || {}).flat();
  const totalFutureHours = allFutureCourses.reduce((sum, code) => {
    let hours = 0;
    Object.values(majorData.requirements).forEach(cat => {
      const course = cat.courses.find(c => c.code === code);
      if (course) hours = course.hours;
    });
    return sum + hours;
  }, 0);

  // Get remaining categories that need courses
  const remainingCategories = useMemo(() => {
    const remaining = [];
    Object.entries(majorData.requirements).forEach(([key, cat]) => {
      const completed = cat.courses.filter(c => completedCourses.includes(c.code));
      const planned = cat.courses.filter(c => plannedCourses.includes(c.code));
      const future = cat.courses.filter(c => allFutureCourses.includes(c.code));

      const hoursCompleted = completed.reduce((sum, c) => sum + c.hours, 0);
      const hoursPlanned = planned.reduce((sum, c) => sum + c.hours, 0);
      const hoursFuture = future.reduce((sum, c) => sum + c.hours, 0);
      const totalScheduled = hoursCompleted + hoursPlanned + hoursFuture;

      if (totalScheduled < cat.hours) {
        remaining.push({
          key,
          name: cat.name,
          hoursNeeded: cat.hours - totalScheduled,
          totalRequired: cat.hours,
          scheduled: totalScheduled
        });
      }
    });
    return remaining;
  }, [completedCourses, plannedCourses, allFutureCourses, majorData]);

  // Generate suggested semester sequence based on expected graduation
  const suggestedSequence = useMemo(() => {
    if (!expectedGraduation || remainingCategories.length === 0) return [];

    const [semester, yearStr] = expectedGraduation.split(' ');
    const gradYear = parseInt(yearStr);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Determine starting semester
    let startSemester = currentMonth >= 8 ? 'Spring' : 'Fall';
    let startYear = currentMonth >= 8 ? currentYear + 1 : currentYear;

    // Generate semester slots until graduation
    const semesters = [];
    let year = startYear;
    let sem = startSemester;

    while (year < gradYear || (year === gradYear && (sem === 'Spring' || semester === 'Fall'))) {
      semesters.push(`${sem} ${year}`);
      if (sem === 'Spring') {
        sem = 'Fall';
      } else {
        sem = 'Spring';
        year++;
      }

      // Safety check
      if (semesters.length > 12) break;

      // Stop if we've reached the graduation semester
      if (year === gradYear && sem === semester) {
        semesters.push(`${sem} ${year}`);
        break;
      }
    }

    // Prioritize categories
    const prioritized = [...remainingCategories].sort((a, b) => {
      // Junior seminars should be in year 3
      if (a.name.includes('Junior') || a.name.includes('Seminar')) return -1;
      if (b.name.includes('Junior') || b.name.includes('Seminar')) return 1;

      // Prerequisites should come first
      if (a.name.includes('Prerequisite')) return -1;
      if (b.name.includes('Prerequisite')) return 1;

      // Larger requirements first to spread out workload
      return b.hoursNeeded - a.hoursNeeded;
    });

    // Distribute categories across semesters
    const distribution = semesters.map(sem => ({ semester: sem, categories: [] }));
    let semesterIndex = 0;

    prioritized.forEach(cat => {
      if (semesterIndex >= distribution.length) {
        semesterIndex = 0; // Wrap around if needed
      }
      distribution[semesterIndex].categories.push(cat);
      semesterIndex++;
    });

    return distribution.filter(d => d.categories.length > 0);
  }, [expectedGraduation, remainingCategories]);

  return (
    <div>
      {/* Graduation Semester Input */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
            <label className="font-medium text-purple-900 text-sm sm:text-base whitespace-nowrap">Expected Graduation:</label>
          </div>
          <select
            value={expectedGraduation}
            onChange={(e) => onGraduationChange(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base w-full sm:w-auto"
          >
            <option value="">Select semester...</option>
            {semesterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {expectedGraduation && (
            <span className="text-xs sm:text-sm text-purple-700 break-words">
              Plan your courses to complete requirements by {expectedGraduation}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar & Major Info */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 sm:p-6 rounded-xl mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold break-words">{majorData.name} Major</h2>
            <p className="text-purple-200 mt-1 text-sm sm:text-base break-words">{majorData.description}</p>
            <div className="mt-3 flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
              <span className="bg-green-500/40 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap font-medium">
                {totalCompleted}/{majorData.totalHours} Total Hours
              </span>
              <span className={`px-2 sm:px-3 py-1 rounded-full whitespace-nowrap font-medium ${
                lowerDivisionStatus === 'ok' ? 'bg-green-500/40' :
                lowerDivisionStatus === 'warning' ? 'bg-yellow-500/40' :
                'bg-red-500/40'
              }`}>
                {lowerDivisionHours}/{majorData.maxLowerDivision} Lower-Div {lowerDivisionHours > majorData.maxLowerDivision && '⚠️'}
              </span>
              {totalPlanned > 0 && (
                <span className="bg-blue-500/40 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                  +{totalPlanned} planned
                </span>
              )}
            </div>
          </div>
          <div className="text-center flex-shrink-0">
            <ProgressRing progress={progress} />
            {totalPlanned > 0 && (
              <div className="text-xs text-purple-200 mt-1 whitespace-nowrap">
                {Math.round(projectedProgress)}% after planned
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Important Advising Notes */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 sm:p-5 mb-6">
        <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2 text-base sm:text-lg">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0" />
          Important Advising Notes
        </h3>
        <ul className="space-y-2 text-sm sm:text-base">
          <li className="flex items-start gap-2 text-amber-900">
            <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span><strong>30000+ level ENGL courses:</strong> Most require ENGL 10803, ENGL 20803, and at least one 10000- or 20000-level ENGL/WRIT/CRWT course</span>
          </li>
          <li className="flex items-start gap-2 text-amber-900">
            <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span><strong>Writing & Rhetoric:</strong> Students who declared Fall 2025 may count 12 lower-division hours (normally 9 hours)</span>
          </li>
          <li className="flex items-start gap-2 text-amber-900">
            <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span><strong>Creative Writing:</strong> Only 3 lower-division hours count toward the major</span>
          </li>
          <li className="flex items-start gap-2 text-amber-900">
            <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">•</span>
            <span><strong>English:</strong> No more than 9 hours of lower-division courses total count toward the major</span>
          </li>
        </ul>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Course Selection</h3>
          <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
            {completedCourses.length} completed • {plannedCourses.length} next semester • {allFutureCourses.length} future
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => onStepChange(1)}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              selectionStep === 1
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                selectionStep === 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className="text-left">
                <div className={`font-medium text-sm ${selectionStep === 1 ? 'text-green-700' : 'text-gray-700'}`}>
                  Completed
                </div>
                <div className="text-xs text-gray-500">
                  Courses already taken
                </div>
              </div>
            </div>
          </button>
          <button
            onClick={() => onStepChange(2)}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              selectionStep === 2
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                selectionStep === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className="text-left">
                <div className={`font-medium text-sm ${selectionStep === 2 ? 'text-blue-700' : 'text-gray-700'}`}>
                  Coming Semester
                </div>
                <div className="text-xs text-gray-500">
                  Next semester plan
                </div>
              </div>
            </div>
          </button>
          <button
            onClick={() => onStepChange(3)}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              selectionStep === 3
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                selectionStep === 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <div className="text-left">
                <div className={`font-medium text-sm ${selectionStep === 3 ? 'text-orange-700' : 'text-gray-700'}`}>
                  Future Plan
                </div>
                <div className="text-xs text-gray-500">
                  Remaining courses
                </div>
              </div>
            </div>
          </button>
        </div>
        {selectionStep === 1 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Step 1:</strong> Check the boxes next to courses you have already completed. These will be marked in green.
            </p>
          </div>
        )}
        {selectionStep === 2 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Step 2:</strong> Check the boxes next to courses you plan to take next semester. Completed courses are locked. Planned courses will be marked in blue.
            </p>
          </div>
        )}
        {selectionStep === 3 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Step 3:</strong> Plan which requirement categories you'll complete each semester. Since not all courses are offered every semester, plan by category rather than specific courses.
            </p>
          </div>
        )}
      </div>

      {selectionStep === 1 && (
        <CatalogList completedCourses={completedCourses} onToggleCourse={onToggleCourse} />
      )}

      {/* Step 3: Future Planning UI */}
      {selectionStep === 3 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Plan Remaining Requirements
          </h3>

          {remainingCategories.length === 0 ? (
            <div className="text-center py-8 text-green-600">
              <CheckCircle className="w-12 h-12 mx-auto mb-2" />
              <p className="font-medium">All requirements are satisfied!</p>
              <p className="text-sm text-gray-600 mt-1">You've completed or planned all required hours for this major.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Category-Based Planning</p>
                    <p>Plan which requirement categories to complete each semester. When it's time to register, choose specific courses from each category based on availability and your interests.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Requirements Still Needed ({remainingCategories.length} categories)
                </h4>
                {remainingCategories.map(cat => (
                  <div key={cat.key} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm sm:text-base break-words">{cat.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">
                          Need {cat.hoursNeeded} more hours ({cat.scheduled}/{cat.totalRequired} scheduled)
                        </div>
                        <div className="mt-2 text-xs text-gray-500 break-words">
                          Available courses in {cat.name} - check course catalog or advisor for current offerings
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                          {cat.hoursNeeded} hrs
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {suggestedSequence.length > 0 && expectedGraduation && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Suggested Sequence to {expectedGraduation}
                  </h4>
                  <div className="space-y-3">
                    {suggestedSequence.map((sem, idx) => {
                      const totalHours = sem.categories.reduce((sum, cat) => sum + cat.hoursNeeded, 0);
                      return (
                        <div key={sem.semester} className="border border-purple-200 rounded-lg p-3 sm:p-4 bg-purple-50">
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div className="font-medium text-purple-900 text-sm sm:text-base">{sem.semester}</div>
                            <div className="text-xs sm:text-sm text-purple-700 whitespace-nowrap">{totalHours} hours</div>
                          </div>
                          <div className="space-y-2">
                            {sem.categories.map(cat => (
                              <div key={cat.key} className="flex items-start justify-between gap-2 text-sm">
                                <span className="text-gray-700 break-words flex-1 min-w-0">{cat.name}</span>
                                <span className="text-purple-600 font-medium whitespace-nowrap flex-shrink-0">{cat.hoursNeeded} hrs</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-xs text-gray-600 italic">
                    This is a suggested distribution. Adjust based on course availability and your schedule.
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Planning Tips</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Not all courses are offered every semester - check with your advisor</li>
                      <li>Some courses have prerequisites that must be completed first</li>
                      <li>Plan to complete requirements progressively across semesters</li>
                      <li>Junior seminars should be taken in your junior year</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
              plannedCourses={plannedCourses}
              onToggleCourse={onToggleCourse}
              isExpanded={expandedCategories.has(key)}
              onToggleExpand={() => toggleCategory(key)}
              selectionStep={selectionStep}
              allRequirements={majorData.requirements}
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
                plannedCourses={plannedCourses}
                onToggleCourse={onToggleCourse}
                isExpanded={expandedCategories.has(key)}
                onToggleExpand={() => toggleCategory(key)}
                selectionStep={selectionStep}
                allRequirements={majorData.requirements}
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
  const yearLabels = ['First Year', 'Sophomore Year', 'Junior Year', 'Senior Year'];

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
      chainMap['Digital Creative Writing'] = [
        { code: 'CRWT 10203', title: 'Intro to Creative Writing' },
        { code: 'CRWT 30363', title: 'Digital Creative Writing' },
      ];
    }

    if (major === 'writing') {
      chainMap['Professional Writing'] = [
        { code: 'WRIT 20113', title: 'Technical and Professional Writing' },
        { code: 'WRIT 40243', title: 'Advanced Professional Writing' },
      ];
      chainMap['Technical Writing'] = [
        { code: 'WRIT 20113', title: 'Technical and Professional Writing' },
        { code: 'WRIT 30223', title: 'Advanced Technical Writing' },
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

      {/* General Prerequisites Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-4">
          <Info className="w-5 h-5" />
          General Prerequisites for Upper-Division Courses
        </h3>
        <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
          <p className="text-sm text-blue-900 font-medium mb-2">Most 30000+ level ENGL courses require ALL of the following:</p>
          <div className="flex flex-col gap-2 ml-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span><strong>ENGL 10803</strong> - First-Year Writing</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span><strong>ENGL 20803</strong> - Writing Arguments</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span><strong>At least one 10000- or 20000-level</strong> ENGL/WRIT/CRWT course</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-blue-700 italic">
          These "gateway" courses build foundational skills for advanced literature and writing courses.
        </p>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5" />
          Important Planning Notes
        </h3>
        <ul className="text-sm text-amber-800 space-y-2">
          <li>• <strong>Workshop II courses</strong> require completion of Workshop I in the same genre</li>
          <li>• <strong>Advanced Multi-Genre Workshop</strong> requires completion of at least one 30000-level workshop</li>
          <li>• <strong>Junior Seminars</strong> (38000-level) should be taken in fall of junior year</li>
          <li>• <strong>Writing Internship</strong> requires completion of the Writing Major Seminar first</li>
          <li>• <strong>40000-level courses</strong> may have additional prerequisites beyond the general requirements</li>
          <li>• Always check the course catalog for specific prerequisites and consult your advisor</li>
        </ul>
      </div>

      {/* Quick Reference */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h3 className="font-bold text-purple-900 mb-3">Quick Reference: Course Levels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="font-semibold text-purple-900 mb-1">10000-level</div>
            <div className="text-gray-600">Introductory courses, no prerequisites</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="font-semibold text-purple-900 mb-1">20000-level</div>
            <div className="text-gray-600">Lower-division, may require ENGL 10803</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="font-semibold text-purple-900 mb-1">30000-level</div>
            <div className="text-gray-600">Upper-division, requires gateway courses</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="font-semibold text-purple-900 mb-1">40000-level</div>
            <div className="text-gray-600">Advanced, may have additional prerequisites</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

// Generate semester options for graduation picker
function generateSemesterOptions() {
  const options = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year <= currentYear + 6; year++) {
    options.push({ value: `Spring ${year}`, label: `Spring ${year}` });
    options.push({ value: `Fall ${year}`, label: `Fall ${year}` });
  }
  return options;
}

export default function TCUEnglishAdvisingApp() {
  const [selectedMajor, setSelectedMajor] = useState('english');
  const [activeTab, setActiveTab] = useState('requirements');
  const [completedCourses, setCompletedCourses] = useState([]);
  const [plannedCourses, setPlannedCourses] = useState([]);  // Coming semester
  const [futureCourses, setFutureCourses] = useState({});    // Future semesters: { "Fall 2026": ["ENGL 30103"], ... }
  const [selectionStep, setSelectionStep] = useState(1);      // 1 = completed, 2 = planned, 3 = future
  const [expectedGraduation, setExpectedGraduation] = useState('');
  const [totalCreditHours, setTotalCreditHours] = useState(0); // Total college credit hours earned

  // Get all future planned courses (across all future semesters)
  const allFutureCourses = useMemo(() => {
    return Object.values(futureCourses).flat();
  }, [futureCourses]);

  const toggleCourse = (code, targetSemester = null) => {
    if (selectionStep === 1) {
      // Step 1: Selecting completed courses
      if (!completedCourses.includes(code)) {
        // Special check for ENGL 20803: requires 30 credit hours
        if (code === 'ENGL 20803') {
          if (totalCreditHours < 30) {
            alert(`ENGL 20803 requires 30 total credit hours to enroll.\n\nYou currently have ${totalCreditHours} credit hours entered.\nYou need ${30 - totalCreditHours} more credit hours before taking this course.\n\nUpdate your total credit hours in the field above if needed.`);
            return;
          }
        }

        const prereqs = PREREQUISITES[code];
        if (prereqs && prereqs.length > 0) {
          const prereqList = prereqs.map(p => p);
          const hasPrereq = prereqs.some(p => completedCourses.includes(p));

          if (!hasPrereq) {
            alert(`You must complete at least one of the following prerequisites before taking ${code}:\n\n${prereqList.join('\n')}`);
            return;
          }
        }

        // Check lower-division hour limits
        const course = ALL_COURSES.find(c => c.code === code);
        const majorData = COURSE_DATA[selectedMajor];

        // Check if this course is lower-division (10000-29999) and not a TCU Core course
        const match = code.match(/(\d{5})/);
        const isLowerDiv = match && parseInt(match[1]) >= 10000 && parseInt(match[1]) < 30000;
        const isNotCoreExclusion = !TCU_CORE_COURSES.includes(code);

        if (course && isLowerDiv && isNotCoreExclusion) {
          const currentLowerDivHours = [...completedCourses, ...plannedCourses, ...allFutureCourses]
            .reduce((total, c) => {
              if (TCU_CORE_COURSES.includes(c)) return total; // Exclude TCU Core
              const crs = ALL_COURSES.find(course => course.code === c);
              if (crs) {
                const match = c.match(/(\d{5})/);
                if (match) {
                  const courseNum = parseInt(match[1]);
                  if (courseNum >= 10000 && courseNum < 30000) {
                    return total + crs.hours;
                  }
                }
              }
              return total;
            }, 0);

          const newTotal = currentLowerDivHours + course.hours;

          if (newTotal > majorData.maxLowerDivision) {
            const over = newTotal - majorData.maxLowerDivision;
            const proceed = confirm(
              `⚠️ Lower-Division Hour Limit Warning\n\n` +
              `Adding ${code} will bring you to ${newTotal} lower-division hours.\n` +
              `Your major limits these to ${majorData.maxLowerDivision} hours that count toward the degree.\n` +
              `You will be ${over} hour${over > 1 ? 's' : ''} over the limit.\n\n` +
              `Note: If you declared Fall 2025 or later, or have advisor approval, you may have different limits.\n\n` +
              `Click OK to proceed anyway, or Cancel to reconsider.`
            );

            if (!proceed) {
              return;
            }
          }
        }
      }

      // If removing from completed, also remove from planned and future
      if (completedCourses.includes(code)) {
        setPlannedCourses(prev => prev.filter(c => c !== code));
        setFutureCourses(prev => {
          const updated = {};
          Object.entries(prev).forEach(([sem, courses]) => {
            updated[sem] = courses.filter(c => c !== code);
          });
          return updated;
        });
      }

      setCompletedCourses(prev =>
        prev.includes(code)
          ? prev.filter(c => c !== code)
          : [...prev, code]
      );
    } else if (selectionStep === 2) {
      // Step 2: Selecting planned courses for coming semester
      if (completedCourses.includes(code)) return;

      if (!plannedCourses.includes(code)) {
        const prereqs = PREREQUISITES[code];
        if (prereqs && prereqs.length > 0) {
          const prereqList = prereqs.map(p => p);
          const hasPrereq = prereqs.some(p => completedCourses.includes(p) || plannedCourses.includes(p));

          if (!hasPrereq) {
            alert(`You must have completed (or plan to take) at least one of these prerequisites before ${code}:\n\n${prereqList.join('\n')}`);
            return;
          }
        }
      }

      // Remove from future if adding to planned
      if (!plannedCourses.includes(code)) {
        setFutureCourses(prev => {
          const updated = {};
          Object.entries(prev).forEach(([sem, courses]) => {
            updated[sem] = courses.filter(c => c !== code);
          });
          return updated;
        });
      }

      setPlannedCourses(prev =>
        prev.includes(code)
          ? prev.filter(c => c !== code)
          : [...prev, code]
      );
    } else if (selectionStep === 3 && targetSemester) {
      // Step 3: Assigning courses to future semesters
      if (completedCourses.includes(code) || plannedCourses.includes(code)) return;

      setFutureCourses(prev => {
        const updated = { ...prev };

        // Remove from any other semester first
        Object.keys(updated).forEach(sem => {
          if (updated[sem]) {
            updated[sem] = updated[sem].filter(c => c !== code);
          }
        });

        // Add to target semester
        if (!updated[targetSemester]) {
          updated[targetSemester] = [];
        }

        if (!updated[targetSemester].includes(code)) {
          updated[targetSemester] = [...updated[targetSemester], code];
        }

        return updated;
      });
    }
  };

  const removeFutureCourse = (code, semester) => {
    setFutureCourses(prev => ({
      ...prev,
      [semester]: (prev[semester] || []).filter(c => c !== code)
    }));
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold break-words">TCU English Department</h1>
                <p className="text-purple-300 text-xs sm:text-base">Academic Advising Program</p>
              </div>
            </div>
            <button
              onClick={() => generatePDFReport(COURSE_DATA[selectedMajor], completedCourses, plannedCourses, futureCourses, expectedGraduation)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Major Selector */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row gap-2 py-3 sm:py-4">
            {majors.map(major => {
              const Icon = major.icon;
              return (
                <button
                  key={major.id}
                  onClick={() => setSelectedMajor(major.id)}
                  className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    selectedMajor === major.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{major.name}</span>
                </button>
              );
            })}
          </div>

          {/* Total Credit Hours Input */}
          <div className="pb-3 sm:pb-4">
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <label htmlFor="totalCreditHours" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Total Credit Hours Earned:
              </label>
              <input
                id="totalCreditHours"
                type="number"
                min="0"
                max="200"
                value={totalCreditHours}
                onChange={(e) => setTotalCreditHours(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-1.5 border border-gray-300 rounded-md text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600 hidden sm:inline">
                (Include all TCU courses taken)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex gap-3 sm:gap-6 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-3 sm:py-4 border-b-2 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{tab.name}</span>
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
            plannedCourses={plannedCourses}
            futureCourses={futureCourses}
            onToggleCourse={toggleCourse}
            onRemoveFutureCourse={removeFutureCourse}
            selectionStep={selectionStep}
            onStepChange={setSelectionStep}
            expectedGraduation={expectedGraduation}
            onGraduationChange={setExpectedGraduation}
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

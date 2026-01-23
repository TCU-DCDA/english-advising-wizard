#!/usr/bin/env python3
"""
Parse undergraduate CSV files and organize courses by category for integration into App.jsx
"""

import csv
import json
from pathlib import Path

# Map to main repo where the undergraduate CSVs are located
MAIN_REPO = Path("/Users/curtrode/Code/Advising/CoWork_Versions/tcu-english-advising")

def parse_csv(filename):
    """Parse a single undergraduate CSV file"""
    courses = []
    filepath = MAIN_REPO / filename

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header

        for row in reader:
            if len(row) < 3:
                continue

            code = row[0].strip()
            # Skip if not a valid course code
            if not code or len(code) < 8:
                continue

            # Format code with space (ENGL30133 -> ENGL 30133)
            formatted_code = f"{code[:4]} {code[4:]}"

            title = row[2].strip() if len(row) > 2 else "Course Title Unavailable"

            # Try to get hours from different columns
            hours = 3  # default
            if len(row) > 3:
                try:
                    hours = float(row[3])
                    # Handle variable credit (like "1-6")
                    if '-' in str(row[3]):
                        hours = 3
                except (ValueError, TypeError):
                    hours = 3

            # Determine level
            course_num = int(code[4:9])
            level = "lower" if course_num < 30000 else "upper"

            # Skip most 55000-level (graduate) courses unless cross-listed
            if course_num >= 55000 and course_num < 60000:
                # Keep some that are commonly taken by undergrads
                if code not in ["ENGL 50233"]:  # Studies in Creative Writing is cross-listed
                    continue

            courses.append({
                'code': formatted_code,
                'title': title,
                'hours': int(hours),
                'level': level if level == "lower" else None
            })

    return courses

def categorize_courses(courses):
    """Organize courses into categories based on subject and title"""
    categories = {
        'americanLit': [],
        'britishLit': [],
        'globalLit': [],
        'writing': [],
        'theory': [],
        'creativeWriting': [],
        'professionalWriting': [],
        'digitalRhetorics': [],
        'rhetoricsCultures': [],
        'general': []
    }

    for course in courses:
        code = course['code']
        title = course['title'].lower()

        # American Literature
        if any(term in title for term in ['american', 'u.s.', 'latina/o', 'latinx', 'african american', 'asian american', 'native american']):
            categories['americanLit'].append(course)

        # British Literature
        elif any(term in title for term in ['british', 'chaucer', 'milton', 'shakespeare', 'austen', 'arthur', 'victorian', 'renaissance', 'romanticism', 'irish']):
            categories['britishLit'].append(course)

        # Global/Diasporic Literature
        elif any(term in title for term in ['global', 'world literature', 'multi-ethnic', 'post-colonial', 'india', 'diasporic', 'transnational']):
            categories['globalLit'].append(course)

        # Theory
        elif any(term in title for term in ['theory', 'theories', 'criticism', 'pedagogy']):
            categories['theory'].append(course)

        # Creative Writing
        elif code.startswith('CRWT') or 'creative' in title or 'workshop' in title or 'poetry writing' in title or 'fiction writing' in title:
            categories['creativeWriting'].append(course)

        # Professional Writing
        elif any(term in title for term in ['professional writing', 'technical writing', 'editing', 'publishing', 'internship']):
            categories['professionalWriting'].append(course)

        # Digital Rhetorics
        elif any(term in title for term in ['multimedia', 'digital', 'coding', 'games', 'technology', 'social media']):
            categories['digitalRhetorics'].append(course)

        # Rhetorics & Cultures
        elif code.startswith('WRIT') and any(term in title for term in ['rhetoric', 'power', 'protest', 'culture', 'language', 'persuasion', 'argument']):
            categories['rhetoricsCultures'].append(course)

        # General/Electives
        else:
            categories['general'].append(course)

    return categories

def main():
    print("Parsing undergraduate CSV files...")

    all_courses = []
    for i in range(1, 5):
        filename = f"undergraduate ({i}).csv"
        print(f"  Reading {filename}...")
        courses = parse_csv(filename)
        all_courses.extend(courses)
        print(f"    Found {len(courses)} courses")

    print(f"\nTotal courses parsed: {len(all_courses)}")

    # Remove duplicates based on course code
    unique_courses = {}
    for course in all_courses:
        if course['code'] not in unique_courses:
            unique_courses[course['code']] = course

    print(f"Unique courses: {len(unique_courses)}")

    # Categorize
    print("\nCategorizing courses...")
    categories = categorize_courses(list(unique_courses.values()))

    for cat_name, courses in categories.items():
        if courses:
            print(f"  {cat_name}: {len(courses)} courses")

    # Write organized output
    output_file = "organized_courses.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(categories, f, indent=2)

    print(f"\nWrote organized courses to {output_file}")

    # Also create simplified format for easy copying into App.jsx
    print("\nGenerating JavaScript format for App.jsx...")

    for cat_name, courses in categories.items():
        if not courses:
            continue

        print(f"\n// {cat_name} ({len(courses)} courses)")
        print("courses: [")
        for course in sorted(courses, key=lambda x: x['code']):
            level_str = f", level: \"lower\"" if course.get('level') == 'lower' else ""
            print(f"  {{ code: \"{course['code']}\", title: \"{course['title']}\", hours: {course['hours']}{level_str} }},")
        print("]")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Update allCourses.js with proper course titles from undergraduate CSV files
"""

import csv
import json
import re
from pathlib import Path

MAIN_REPO = Path("/Users/curtrode/Code/Advising/CoWork_Versions/tcu-english-advising")

def parse_undergraduate_csvs():
    """Parse all undergraduate CSV files and extract course titles"""
    titles = {}

    for i in range(1, 5):
        filename = f"undergraduate ({i}).csv"
        filepath = MAIN_REPO / filename

        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # Skip header

            for row in reader:
                if len(row) < 3:
                    continue

                code_raw = row[0].strip()
                title = row[2].strip()

                if not code_raw or not title:
                    continue

                # Format code with space (ENGL30133 -> ENGL 30133)
                if len(code_raw) >= 8:
                    formatted_code = f"{code_raw[:4]} {code_raw[4:]}"
                    titles[formatted_code] = title

    return titles

def load_allcourses():
    """Load the current allCourses.js file"""
    filepath = Path("src/allCourses.js")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the JSON array
    match = re.search(r'export const ALL_COURSES = (\[[\s\S]*\]);', content)
    if not match:
        raise ValueError("Could not find ALL_COURSES array")

    json_str = match.group(1)
    courses = json.loads(json_str)

    return courses, content

def update_titles(courses, title_map):
    """Update course titles"""
    updated_count = 0
    unavailable_count = 0

    for course in courses:
        code = course.get('code', '')
        current_title = course.get('title', '')

        # Check if title needs updating
        if current_title == "Course Title Unavailable" or not current_title:
            if code in title_map:
                course['title'] = title_map[code]
                updated_count += 1
                print(f"Updated: {code} -> {title_map[code]}")
            else:
                unavailable_count += 1
                print(f"No title found for: {code}")

    return updated_count, unavailable_count

def save_allcourses(courses):
    """Save updated courses back to allCourses.js"""
    filepath = Path("src/allCourses.js")

    # Create JSON string with proper formatting
    json_str = json.dumps(courses, indent=2, ensure_ascii=False)

    # Create the full file content
    content = f"""// Filtered 55000-level courses
export const ALL_COURSES = {json_str};
"""

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    print("Parsing undergraduate CSV files for course titles...")
    title_map = parse_undergraduate_csvs()
    print(f"Found {len(title_map)} course titles from CSVs\n")

    print("Loading current allCourses.js...")
    courses, _ = load_allcourses()
    print(f"Loaded {len(courses)} courses\n")

    print("Updating course titles...")
    updated, unavailable = update_titles(courses, title_map)

    print(f"\nSaving updated allCourses.js...")
    save_allcourses(courses)

    print(f"\n✓ Complete!")
    print(f"  Updated titles: {updated}")
    print(f"  Still unavailable: {unavailable}")
    print(f"  Total courses: {len(courses)}")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Remove 50000-level graduate courses from allCourses.js
"""

import json
import re
from pathlib import Path

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

    return courses

def filter_50000_level(courses):
    """Remove all 50000-level courses"""
    filtered = []
    removed = []

    for course in courses:
        code = course.get('code', '')

        # Extract course number
        parts = code.split()
        if len(parts) >= 2:
            course_num = parts[1]

            # Check if it's a 50000-level course
            if course_num.startswith('50'):
                removed.append(course)
                print(f"Removing: {code} - {course.get('title', 'No title')}")
            else:
                filtered.append(course)
        else:
            filtered.append(course)

    return filtered, removed

def save_allcourses(courses):
    """Save updated courses back to allCourses.js"""
    filepath = Path("src/allCourses.js")

    # Create JSON string with proper formatting
    json_str = json.dumps(courses, indent=2, ensure_ascii=False)

    # Create the full file content
    content = f"""// Undergraduate courses only (10000-40000 level)
export const ALL_COURSES = {json_str};
"""

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    print("Loading allCourses.js...")
    courses = load_allcourses()
    print(f"Loaded {len(courses)} courses\n")

    print("Filtering out 50000-level courses...")
    filtered, removed = filter_50000_level(courses)

    print(f"\nSaving updated allCourses.js...")
    save_allcourses(filtered)

    print(f"\n✓ Complete!")
    print(f"  Courses removed: {len(removed)}")
    print(f"  Courses remaining: {len(filtered)}")
    print(f"  Original count: {len(courses)}")

if __name__ == "__main__":
    main()

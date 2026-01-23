#!/usr/bin/env python3
"""
Merge course titles from tcu-2026-01-22.csv into courses-report.2026-01-23.csv
"""

import csv
from collections import defaultdict

# Read course titles from tcu-2026-01-22.csv
print("Reading course titles from tcu-2026-01-22.csv...")
course_titles = {}
with open('tcu-2026-01-22.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    for row in reader:
        if len(row) >= 3:
            course_code = row[0].strip()  # e.g., "ENGL30553"
            title = row[2].strip()  # e.g., "19th Century American Novel"
            if course_code and title:
                course_titles[course_code] = title

print(f"Found {len(course_titles)} course titles")

# Read courses-report and add titles
print("\nReading courses-report.2026-01-23.csv...")
output_rows = []
updated_count = 0
missing_count = 0

with open('courses-report.2026-01-23.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)

    # Add "Title" column after "Catalog Number"
    new_header = [header[0], header[1], "Title", header[2]]
    output_rows.append(new_header)

    for row in reader:
        subject = row[0].strip()
        catalog = row[1].strip()
        description = row[2].strip()

        # Build course code (e.g., CRWT10203)
        course_code = f"{subject}{catalog}"

        # Look up title
        title = course_titles.get(course_code, "")

        if title:
            updated_count += 1
        else:
            missing_count += 1

        # Create new row with title inserted
        new_row = [subject, catalog, title, description]
        output_rows.append(new_row)

# Write updated CSV
output_file = 'courses-report.2026-01-23.csv'
print(f"\nWriting updated file to {output_file}...")
with open(output_file, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(output_rows)

print(f"\nCompleted!")
print(f"  Courses with titles added: {updated_count}")
print(f"  Courses without matching titles: {missing_count}")
print(f"  Total courses: {updated_count + missing_count}")

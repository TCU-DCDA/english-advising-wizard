
import csv
import json
import re
import os

input_file = '/Users/curtrode/Code/CDEx/tcu-english-advising/tcu-2026-01-22.csv'
output_file = '/Users/curtrode/Code/CDEx/tcu-english-advising/src/allCourses.js'

courses = []
seen_codes = set()

def format_code(code):
    # Insert space between letters and numbers if missing, e.g. ENGL30553 -> ENGL 30553
    match = re.match(r"([A-Z]+)(\d+)", code)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return code

if not os.path.exists(input_file):
    print(f"File not found: {input_file}")
    exit(1)

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    try:
        header = next(reader) # Skip header
    except StopIteration:
        pass # Empty file

    for row in reader:
        if len(row) < 3:
            continue
        
        # pill-label,course-button href,course-button,course-button (2)
        code_raw = row[0]
        title = row[2]
        desc = row[3] if len(row) > 3 else ""

        code = format_code(code_raw)
        
        if code in seen_codes:
            continue
        
        # Filter for ENGL, CRWT, WRIT
        if not (code.startswith('ENGL') or code.startswith('CRWT') or code.startswith('WRIT')):
            continue

        seen_codes.add(code)
        
        # Try to infer hours from description or default to 3
        # Most classes are 3 hours. Varied hours usually have it in title but mostly 3.
        # Check last digit of code? ENGL 3055(3) -> 3 hours. 
        # Standard TCU numbering: 4th digit (or 5th char of number part) is credit hours.
        # e.g. 30553 -> 3.
        hours = 3
        match_num = re.search(r"\d{5}", code_raw)
        if match_num:
            digits = match_num.group(0)
            last_digit = digits[-1]
            if last_digit.isdigit():
                hours = int(last_digit)


        courses.append({
            "code": code,
            "title": title,
            "hours": hours, 
            "description": desc
        })

# Sort by code
courses.sort(key=lambda x: x['code'])

js_content = f"// Generated from {input_file}\nexport const ALL_COURSES = {json.dumps(courses, indent=2)};"

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Written {len(courses)} courses to {output_file}")

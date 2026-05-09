# OpenSign placement tooling

This folder holds reusable placement definitions and conversion notes for LexySign.

Current finding from the Washburn QDRO test: OpenSign paints the drawn signature inside the widget rectangle, so a widget centered on the signature line causes the final ink to land below the line. The widget needs to be shorter and placed above the visual signature line.

Next implementation step: convert these PDF anchor coordinates into OpenSign placeholder JSON directly instead of relying on Playwright drag/drop.

#!/usr/bin/env python3
"""
build.py — Bundle all modules into single farkle-fate-v2.html
Run: python3 build.py
Output: farkle-fate-v2.html (for local testing without HTTP server)
"""

import re, os

def read(path):
    return open(path).read()

def strip_imports_exports(src):
    src = re.sub(r"^import\s+.*?from\s+['\"].*?[\'\"];\n?", \'\', src, flags=re.MULTILINE)
    src = re.sub(r'^export\s+(default\s+)?(?=class|function|async\s+function)', \'\', src, flags=re.MULTILINE)
    src = re.sub(r'^export\s+(?=const|let|var)', \'\', src, flags=re.MULTILINE)
    src = re.sub(r'^export\s*\{[^}]*\};\n?', \'\', src, flags=re.MULTILINE)
    return src

MODULES = [
    (\'scoring\',      \'src/scoring.js\'),
    (\'TurnState\',    \'src/TurnState.js\'),
    (\'PlayerState\',  \'src/PlayerState.js\'),
    (\'PhaseManager\', \'src/PhaseManager.js\'),
    (\'constants\',    \'src/constants.js\'),
    (\'dice\',         \'src/dice.js\'),
    (\'shop\',         \'src/shop.js\'),
    (\'spells\',       \'src/spells.js\'),
    (\'ai\',           \'src/ai.js\'),
    (\'audio\',        \'src/audio.js\'),
    (\'particles\',    \'src/particles.js\'),
    (\'renderHUD\',    \'src/render/renderHUD.js\'),
    (\'renderVault\',  \'src/render/renderVault.js\'),
    (\'renderZone\',   \'src/render/renderZone.js\'),
    (\'game\',         \'src/game.js\'),
]

def build():
    css = read(\'style/vars.css\') + \'\\n\' + read(\'style/layout.css\') + \'\\n\' + read(\'style/components.css\')
    
    js_parts = []
    for name, path in MODULES:
        src = strip_imports_exports(read(path))
        js_parts.append(f\'// ══ {name} ══\\n\' + src)
    
    index = read(\'index.html\')
    
    # Extract init block from index.html
    init_match = re.search(r\'<script type=\\"module\\">(.*?)</script>\', index, re.DOTALL)
    init_block = init_match.group(1) if init_match else \'\'
    init_clean = re.sub(r'^import.*?\\n\', \'\', init_block, flags=re.MULTILINE).strip()
    
    # Extract body HTML
    body = re.sub(r\'<script.*?</script>\', \'\', index, flags=re.DOTALL)
    body = re.sub(r\'<link.*?\\n\', \'\', body)
    
    bundle = f\'\'\'<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FARKLE &amp; FATE</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body class="skin-tavern">
{body}
<script>
{\'\\n\'.join(js_parts)}

// ══ init ══
{init_clean}
</script>
</body>
</html>
\'\'\'
    
    open(\'farkle-fate-v2.html\', \'w\').write(bundle)
    lines = bundle.count(\'\\n\')
    print(f\'✓ Bundle written: farkle-fate-v2.html ({lines} lines)\')

if __name__ == \'__main__\':
    build()

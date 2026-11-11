#!/bin/sh
# Rebuilds index.html from the base file plus every module, then syntax-checks the result.
set -e
cd "$(dirname "$0")"
python3 source/edits.py source/base_v947.html index.html $(ls source/modules/*.js | sort)
python3 -c "
s=open('index.html').read();i=s.index('<script>');j=s.rindex('</script>');open('.chk.js','w').write(s[i+8:j])"
node --check .chk.js && rm -f .chk.js && echo SYNTAX-OK

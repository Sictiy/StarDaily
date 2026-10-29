import os
from pathlib import Path
import tempfile
import unittest

import app
from collect import parse_trending

def html_card(i):
    return f'''<article class="Box-row"><h2><a href="/owner/repo{i}"> owner / repo{i}</a></h2><p>Project {i}</p><span itemprop="programmingLanguage">Python</span><a href="/owner/repo{i}/stargazers"> {1000+i:,} </a><span> {i:,} stars today </span></article>'''

class CoreTests(unittest.TestCase):
    def test_trending_sorted_by_daily_stars(self):
        result = sorted(parse_trending(''.join(html_card(i) for i in range(1, 26))), key=lambda i: -i['daily_stars'])[:20]
        self.assertEqual(len(result), 20)
        self.assertEqual(result[0]['name'], 'owner/repo25')
        self.assertEqual(result[0]['daily_stars'], 25)
        self.assertEqual(result[-1]['daily_stars'], 6)
        self.assertEqual(result[0]['total_stars'], 1025)
    def test_malformed_card_is_rejected(self):
        with self.assertRaises(ValueError): parse_trending('<article class="Box-row"><h2>bad</h2></article>')
    def test_database_read_and_replacement(self):
        with tempfile.TemporaryDirectory() as temp:
            old = app.DB; app.DB = Path(temp) / 'test.db'
            try:
                with app.connect() as db:
                    db.execute('INSERT INTO editions VALUES (?, ?, ?)', ('2026-10-29','2026-10-29T08:00:00+08:00','https://github.com/trending'))
                    db.execute('INSERT INTO repositories VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ('2026-10-29',1,'a/b','https://github.com/a/b','说明','Python',100,25))
                result = app.read_edition()
                self.assertEqual(result['repositories'][0]['daily_stars'], 25)
                self.assertEqual(result['dates'], ['2026-10-29'])
                with app.connect() as db: db.execute('DELETE FROM editions WHERE date=?', ('2026-10-29',))
                self.assertEqual(app.read_edition()['repositories'], [])
            finally: app.DB = old

if __name__ == '__main__': unittest.main()

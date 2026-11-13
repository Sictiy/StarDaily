from pathlib import Path
import tempfile
import unittest

import app


class WeeklyRankingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_db = app.DB
        app.DB = Path(self.temp.name) / 'stars.db'

    def tearDown(self):
        app.DB = self.old_db
        self.temp.cleanup()

    def add_edition(self, date, projects):
        with app.connect() as db:
            db.execute('INSERT INTO editions VALUES (?, ?, ?)', (date, date + 'T08:00:00+08:00', 'source'))
            for rank, (name, stars, description) in enumerate(projects, 1):
                db.execute('INSERT INTO repositories VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                           (date, rank, name, 'https://github.com/' + name, description, 'Python', 100 + stars, stars))

    def test_weekly_merges_only_selected_seven_calendar_days(self):
        self.add_edition('2026-11-06', [('a/repo', 10000, 'outside window')])
        self.add_edition('2026-11-07', [('a/repo', 20, 'old description'), ('c/repo', 70, 'c')])
        self.add_edition('2026-11-12', [('b/repo', 65, 'b')])
        self.add_edition('2026-11-13', [('A/Repo', 50, 'latest description'), ('b/repo', 10, 'new b')])

        weekly = app.read_edition('2026-11-13', 'weekly')
        self.assertEqual(weekly['window'], {'start': '2026-11-07', 'end': '2026-11-13', 'available_days': 3, 'total_days': 7})
        self.assertEqual([(r['name'], r['period_stars']) for r in weekly['repositories']],
                         [('b/repo', 75), ('A/Repo', 70), ('c/repo', 70)])
        merged = weekly['repositories'][1]
        self.assertEqual(merged['description'], 'latest description')
        self.assertEqual(merged['total_stars'], 150)
        self.assertEqual(merged['appearances'], 2)
        self.assertEqual([r['rank'] for r in weekly['repositories']], [1, 2, 3])

        historical = app.read_edition('2026-11-12', 'weekly')
        self.assertEqual(historical['window']['start'], '2026-11-06')
        self.assertEqual(historical['repositories'][0]['period_stars'], 10020)
        self.assertEqual(historical['repositories'][0]['description'], 'old description')
        self.assertNotIn('2026-11-13', [historical['window']['end']])

        daily = app.read_edition('2026-11-13')
        self.assertEqual([(r['name'], r['daily_stars']) for r in daily['repositories']], [('A/Repo', 50), ('b/repo', 10)])

    def test_weekly_returns_top_twenty_and_breaks_ties_by_name(self):
        self.add_edition('2026-11-13', [(f'owner/repo{i:02d}', i // 2, 'project') for i in range(25)])
        rows = app.read_edition(period='weekly')['repositories']
        self.assertEqual(len(rows), 20)
        self.assertEqual([r['name'] for r in rows[:3]], ['owner/repo24', 'owner/repo22', 'owner/repo23'])
        self.assertEqual(rows[-1]['rank'], 20)

    def test_empty_unknown_date_and_invalid_period(self):
        self.assertIsNone(app.read_edition(period='weekly')['edition'])
        self.add_edition('2026-11-13', [('a/b', 12, 'project')])
        self.assertEqual(app.read_edition('2026-11-12', 'weekly')['repositories'], [])
        with self.assertRaises(ValueError):
            app.read_edition(period='monthly')


if __name__ == '__main__':
    unittest.main()

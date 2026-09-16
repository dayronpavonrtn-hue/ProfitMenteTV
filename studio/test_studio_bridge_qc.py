import unittest

from studio_bridge import convert


class StudioBridgeQCTests(unittest.TestCase):
    def test_missing_exported_asset_is_reported(self):
        plan = convert({
            'duration': 10,
            'clips': [{'id': 'c1', 'track': 0, 'start': 0, 'duration': 2, 'asset': 'missing'}],
            'assets': [],
        })
        self.assertIn('qc', plan)
        self.assertTrue(plan['qc']['errors'])


if __name__ == '__main__':
    unittest.main()

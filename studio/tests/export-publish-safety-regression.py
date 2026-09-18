import json
import tempfile
import unittest
from pathlib import Path

from studio.export_pipeline import export_file


class ExportPublishSafetyRegression(unittest.TestCase):
    def _write_project(self, root, project):
        source = root / 'project.json'
        source.write_text(json.dumps(project), encoding='utf-8')
        return source

    def test_failed_final_qa_does_not_overwrite_existing_export(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = self._write_project(root, {'duration': 10, 'clips': []})
            destination = root / 'export.json'
            destination.write_text('KNOWN-GOOD', encoding='utf-8')

            with self.assertRaisesRegex(ValueError, 'Exportación bloqueada por QA'):
                export_file(source, destination, final=True)

            self.assertEqual(destination.read_text(encoding='utf-8'), 'KNOWN-GOOD')
            self.assertEqual(list(root.glob('.export.json.*.tmp')), [])

    def test_successful_export_replaces_destination_with_complete_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project = {
                'duration': 4,
                'media': [{'id': 'm1', 'name': 'clip.mp4', 'type': 'video/mp4', 'duration': 4}],
                'clips': [{'id': 'v1', 'track': 0, 'start': 0, 'duration': 4, 'mediaId': 'm1'}],
            }
            source = self._write_project(root, project)
            destination = root / 'export.json'
            destination.write_text('OLD', encoding='utf-8')

            result = export_file(source, destination, final=True)
            persisted = json.loads(destination.read_text(encoding='utf-8'))

            self.assertTrue(result['ok'])
            self.assertTrue(persisted['ok'])
            self.assertEqual(persisted['qa']['stage'], 'final-render')
            self.assertEqual(list(root.glob('.export.json.*.tmp')), [])


if __name__ == '__main__':
    unittest.main()

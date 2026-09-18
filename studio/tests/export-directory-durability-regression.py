import tempfile
import unittest
from pathlib import Path
from unittest import mock

from studio import export_pipeline


class ExportDirectoryDurabilityRegression(unittest.TestCase):
    def test_atomic_publish_syncs_parent_after_replace_on_posix(self):
        if export_pipeline.os.name == 'nt' or not hasattr(export_pipeline.os, 'O_DIRECTORY'):
            self.skipTest('directory fsync is POSIX-only')

        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / 'nested' / 'export.json'
            events = []
            real_replace = export_pipeline.os.replace
            real_sync = export_pipeline._sync_parent_directory

            def tracked_replace(source, target):
                events.append('replace')
                return real_replace(source, target)

            def tracked_sync(directory):
                events.append('dir-fsync')
                return real_sync(directory)

            with mock.patch.object(export_pipeline.os, 'replace', side_effect=tracked_replace), \
                    mock.patch.object(export_pipeline, '_sync_parent_directory', side_effect=tracked_sync):
                export_pipeline._atomic_write_json(destination, {'ok': True})

            self.assertEqual(events, ['replace', 'dir-fsync'])
            self.assertTrue(destination.is_file())
            self.assertEqual(list(destination.parent.glob('.export.json.*.tmp')), [])

    def test_directory_sync_failure_never_leaves_temp_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / 'export.json'
            with mock.patch.object(export_pipeline, '_sync_parent_directory', side_effect=OSError('sync failed')):
                with self.assertRaisesRegex(OSError, 'sync failed'):
                    export_pipeline._atomic_write_json(destination, {'ok': True})

            # The rename may already have completed, but a stale temporary export must
            # never remain and be mistaken for a resumable/publishable render artifact.
            self.assertEqual(list(Path(tmp).glob('.export.json.*.tmp')), [])


if __name__ == '__main__':
    unittest.main()

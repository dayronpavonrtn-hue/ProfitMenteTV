#!/usr/bin/env python3
import copy
import math
import unittest

from caption_render_timing import normalize_project_caption_timings, normalize_word_timings


class CaptionRenderTimingTests(unittest.TestCase):
    def test_native_absolute_timings_are_preserved(self):
        clip={"track":3,"start":10,"duration":4,"wordTimings":[{"word":"Dinero","start":10.5,"end":11.2}]}
        self.assertEqual(normalize_word_timings(clip,10,14),[("Dinero",10.5,11.2)])

    def test_explicit_relative_start_duration_becomes_absolute(self):
        clip={"track":3,"start":10,"duration":4,"wordTimingMode":"relative","wordTimings":[{"word":"Crece","start":.5,"duration":.8}]}
        out=normalize_project_caption_timings({"clips":[clip]})
        timing=out["clips"][0]["wordTimings"][0]
        self.assertEqual(timing,{"word":"Crece","start":10.5,"end":11.3,"duration":.8})
        self.assertEqual(out["clips"][0]["wordTimingMode"],"absolute")

    def test_legacy_relative_timings_are_auto_detected(self):
        clip={"track":"3","start":20,"duration":5,"wordTimings":[
            {"word":"Uno","start":0,"end":1},
            {"text":"Dos","start":1,"duration":1.5},
        ]}
        out=normalize_project_caption_timings({"clips":[clip]})["clips"][0]["wordTimings"]
        self.assertEqual([(x["word"],x["start"],x["end"]) for x in out],[
            ("Uno",20.0,21.0),("Dos",21.0,22.5)
        ])

    def test_intervals_are_clamped_to_caption_clip(self):
        clip={"track":3,"start":5,"duration":2,"wordTimingMode":"absolute","wordTimings":[
            {"word":"Inicio","start":4.5,"end":5.5},
            {"word":"Fin","start":6.5,"end":8},
        ]}
        out=normalize_project_caption_timings({"clips":[clip]})["clips"][0]["wordTimings"]
        self.assertEqual([(x["start"],x["end"]) for x in out],[(5.0,5.5),(6.5,7.0)])

    def test_corrupt_values_are_dropped_without_mutating_source(self):
        source={"clips":[{"track":3,"start":3,"duration":2,"wordTimings":[
            {"word":"ok","start":3.1,"duration":.4},
            {"word":"bool","start":True,"end":4},
            {"word":"nan","start":"nan","end":4},
            {"word":{"fake":"text"},"start":3,"end":4},
            {"word":"reverse","start":4,"end":3},
        ]}]}
        before=copy.deepcopy(source)
        result=normalize_project_caption_timings(source)
        self.assertEqual(source,before)
        self.assertEqual([x["word"] for x in result["clips"][0]["wordTimings"]],["ok"])
        values=result["clips"][0]["wordTimings"][0].values()
        self.assertTrue(all(not isinstance(x,float) or math.isfinite(x) for x in values))

    def test_non_caption_tracks_are_untouched(self):
        clip={"track":2,"start":9,"duration":1,"wordTimings":[{"word":"Motion","start":0,"end":1}]}
        project={"clips":[clip]}
        self.assertEqual(normalize_project_caption_timings(project),project)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Deterministic public Project Worlds contracts. No external dependency."""
from pathlib import Path
import json,re,unittest
root=Path(__file__).resolve().parents[1]

class WorldContract(unittest.TestCase):
 def test_has_all_eight_ids(self):
  projects=json.loads((root/'data/projects.json').read_text())['projects']; self.assertEqual(len(projects),8)
  html=(root/'index.html').read_text();js=(root/'v4/worlds.js').read_text()
  self.assertIn('v43-world',html);self.assertIn('maxFocusProjects = 8',js)
  for p in projects:self.assertRegex(p['id'],r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
 def test_no_unsigned_public_release(self):
  releases=json.loads((root/'data/releases.json').read_text())
  self.assertEqual(releases['published_releases'],[])
 def test_preserves_original_project_route(self):
  h=(root/'index.html').read_text()
  for mark in ['id="view-project"','id="project-experience-content"','function renderProjectExperience','id="view-releases"','id="view-creations"']:
   self.assertIn(mark,h)
  self.assertIn('No studio-approved public download',h)
 def test_public_only_and_no_data_writes(self):
  js=(root/'v4/worlds.js').read_text()
  for unsafe in ['localStorage','sessionStorage','/api/local','/api/cloud','fetch(', 'https://github.com/']:
   self.assertNotIn(unsafe,js)
  self.assertNotIn('download=',js)
 def test_keyboard_and_reduced_motion(self):
  js=(root/'v4/worlds.js').read_text();css=(root/'v4/worlds.css').read_text()
  for flag in ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End','aria-selected','aria-current']:
   self.assertIn(flag,js)
  self.assertIn('prefers-reduced-motion:reduce',css)
 def test_scoped_design(self):
  css=(root/'v4/worlds.css').read_text();self.assertIn('#view-project .v43-world',css)
 def test_build_order(self):
  integration=(root/'v4/integrate.py').read_text()
  self.assertIn("(base/'worlds.css')",integration)
  self.assertIn("(base/'worlds.js')",integration)
  self.assertLess(integration.index("(base/'home.js')"),integration.index("(base/'worlds.js')"))

if __name__=='__main__': unittest.main()

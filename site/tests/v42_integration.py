"""V4 public homepage and existing project/release truth contract."""
from pathlib import Path
import unittest,json,re,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from v4.integrate import integrate
ROOT=Path(__file__).resolve().parents[1]

class PublicHomeIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.home=(ROOT/'v4/home.html').read_text(encoding='utf-8')
        cls.css=(ROOT/'v4/home.css').read_text(encoding='utf-8')
        cls.js=(ROOT/'v4/home.js').read_text(encoding='utf-8')
        cls.index=(ROOT/'index.html').read_text(encoding='utf-8')
        cls.catalog=json.loads((ROOT/'data/projects.json').read_text(encoding='utf-8'))
    def test_public_catalog_ids_match(self):
        match=re.search(r'<script id="v4-project-data" type="application/json">(.*?)</script>',self.home,re.S)
        self.assertIsNotNone(match)
        content=json.loads(match.group(1))
        self.assertEqual([p['id'] for p in content['projects']],[p['id'] for p in self.catalog['projects']])
        self.assertEqual([(p['name'],p['summary'],p['repository']) for p in content['projects']],[(p['name'],p['summary'],p['repository']) for p in self.catalog['projects']])
    def test_no_public_releases_claimed(self):
        self.assertEqual(json.loads((ROOT/'data/releases.json').read_text())['published_releases'],[])
        self.assertIn('No approved public releases yet',self.home)
    def test_original_project_pages_preserved(self):
        self.assertEqual(self.index.count('id="view-project"'),1)
        self.assertIn('function projectRouteMatch',self.index)
        self.assertIn('project-story-title',self.index)
        self.assertEqual(self.index.count('id="featured-grid"'),1)
    def test_unique_modal_identity(self):
        for id_ in ['v4-dialog-content','dialog-content','v4-project-data','v4-mobile-nav']:
            self.assertEqual(self.index.count('id="'+id_+'"'),1)
        self.assertNotIn("document.getElementById('site-shell')",self.js)
    def test_no_private_routes_or_unsafe_auto_release(self):
        self.assertNotIn('STUDIO_CLOUD_WRITES_ENABLED',self.home+self.js)
        self.assertNotIn('/api/local/',self.home+self.js)
        self.assertNotIn('approved_download_url',self.home+self.js)
    def test_home_scoped_styles(self):
        self.assertIn('#view-home.v4-home .hero',self.css)
        self.assertIn('body:has(#view-home.is-active)',self.css)
    def test_output_matches_postbuild_transform(self):
        self.assertIn('<!-- HOME V4.2 · A+C REVIEW -->',self.index)
        self.assertEqual(self.index.count('id="view-home"'),1)
        self.assertIn('No studio-approved public download',self.index)

if __name__=='__main__':unittest.main()

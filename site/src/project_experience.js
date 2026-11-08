/**
 * NAVIN STUDIO — M3 editorial project stories.
 * These are public creative briefs, NOT claims that features are shipped.
 * Reuses the validated public catalog's release state and authored artwork.
 */

function projectRouteMatch(route) {
  return /^project\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(route || '');
}

function projectEditorial(id) {
  const briefs = {
    'backlot': {
      opening: 'A quieter, more intentional home for the creative process.',
      thesis: 'Good ideas should become finished work—not get lost between notes, reminders and scattered plans. Backlot explores what happens when a creator’s day is designed around making.',
      facets: [
        ['Capture', 'Bring ideas, projects and loose thoughts into one creative space.'],
        ['Direction', 'Give the next piece of work a clear place in the day.'],
        ['Momentum', 'Explore reminders and routines that support consistent progress.']
      ],
      closer: 'Built around the belief that tools should protect creative attention.'
    },
    'frame-one': {
      opening: 'Learn the language of cinema by actually exploring it.',
      thesis: 'Frame One is a filmmaking education experiment conceived as a journey through framing, storytelling, sound, rhythm and practical creative decisions.',
      facets: [
        ['Discover', 'Approach cinematic concepts through accessible lessons.'],
        ['Practice', 'Connect theory to hands-on experiments and learning labs.'],
        ['See differently', 'Learn to recognize the choices behind visual storytelling.']
      ],
      closer: 'An invitation to become a more curious, thoughtful filmmaker.'
    },
    'cinerelay': {
      opening: 'A better way to find the stories worth watching.',
      thesis: 'CineRelay explores cinema and series discovery with special attention to regional storytelling, verified information and the experience of deciding what to watch.',
      facets: [
        ['Find', 'Browse films and series without losing the joy of discovery.'],
        ['Understand', 'Make release context and source attribution easier to follow.'],
        ['Explore', 'Create space for regional cinema and wider entertainment worlds.']
      ],
      closer: 'Cinema deserves discovery that feels as considered as the stories themselves.'
    },
    'bridge': {
      opening: 'Make room for conversations beyond your usual world.',
      thesis: 'Bridge explores accessible social connection where language is not a hierarchy and conversation feels open, respectful and genuinely human.',
      facets: [
        ['Discover', 'Explore encounters outside familiar circles.'],
        ['Connect', 'Make starting a conversation feel simple and approachable.'],
        ['Include', 'Treat languages and communities with equal importance.']
      ],
      closer: 'An experiment in connection—not a promise of who you will meet.'
    },
    'origin': {
      opening: 'Every creative life begins somewhere.',
      thesis: 'ORIGIN imagines an interactive journey through the decisions, influences and turning points that shape creators and their work.',
      facets: [
        ['Begin', 'Step into the earliest chapters of a creative journey.'],
        ['Explore', 'Follow the stories, questions and choices behind the craft.'],
        ['Reflect', 'Find inspiration in how creative identities take shape.']
      ],
      closer: 'The beginning of a story can be as compelling as its destination.'
    },
    'petping': {
      opening: 'A small reminder can have a little heart.',
      thesis: 'PetPing is a desktop companion concept exploring how everyday reminders can become gentle, playful moments instead of another interruption.',
      facets: [
        ['Appear', 'Explore a friendly character that arrives when needed.'],
        ['Respond', 'Consider reminders with clear Done and Snooze actions.'],
        ['Belong', 'Design for a companion that feels natural on a desktop.']
      ],
      closer: 'A practical tool with enough personality to make the day warmer.'
    },
    'game-01': {
      opening: 'A small move can transform the world around you.',
      thesis: 'Our experimental game space explores responsive motion, satisfying interaction and environments that react to what the player chooses to do.',
      facets: [
        ['Move', 'Make every action feel clear and satisfying.'],
        ['React', 'Explore scenery that responds to the player.'],
        ['Discover', 'Find playful possibilities inside a focused game idea.']
      ],
      closer: 'Simple mechanics, carefully crafted, can carry a surprising amount of wonder.'
    },
    'framebynavin': {
      opening: 'Cinema is more than what happens on screen.',
      thesis: 'FrameByNavin studies why moments work—how framing, sound, performance, editing and direction work together to tell a story.',
      facets: [
        ['Observe', 'Look closely at cinematic language and decisions.'],
        ['Analyze', 'Explore storytelling through an original filmmaker perspective.'],
        ['Create', 'Turn curiosity about movies into thoughtful commentary.']
      ],
      closer: 'For everyone who loves cinema enough to look again.'
    }
  };
  return briefs[id] || {
    opening: 'An idea taking shape inside the studio.',
    thesis: 'A public preview of the work we are exploring.',
    facets: [['Intent','Define the creative problem.'],['Craft','Explore thoughtful interactions.'],['Journey','Follow the project as it develops.']],
    closer: 'More details will follow when they are ready to share.'
  };
}

function renderProjectExperience(project) {
  const root = document.getElementById('project-experience-content');
  if (!root) return;
  const brief = projectEditorial(project.id);
  const related = projects
    .filter(item => item.id !== project.id)
    .sort((a,b) => Number(b.category === project.category) - Number(a.category === project.category))
    .slice(0,2);
  const visual = project.image
    ? '<img class="px-art-image" src="' + esc(project.image) + '" alt="Concept artwork for ' + esc(project.name) + ' — not a product screenshot" />'
    : '<div class="px-art-symbol" aria-hidden="true">' + esc(project.mark) + '</div>';
  const facets = brief.facets.map((item,index) =>
    '<article class="px-facet"><span class="px-index">0' + (index+1) + '</span>' +
    '<h3>' + esc(item[0]) + '</h3><p>' + esc(item[1]) + '</p></article>'
  ).join('');
  const relatedMarkup = related.map(item =>
    '<button class="px-related-card" type="button" data-project="' + esc(item.id) + '">' +
      '<span class="px-related-mark" data-tone="' + esc(item.tone) + '">' + esc(item.mark) + '</span>' +
      '<span class="px-related-copy"><small>' + esc(item.type) + '</small><strong>' + esc(item.name) + '</strong>' +
        '<span>' + esc(item.short) + '</span></span><span class="px-related-arrow" aria-hidden="true">↗</span></button>'
  ).join('');

  const releaseNote = project.approvedDownloadUrl && project.publishedReleaseTag
    ? 'A public release is listed in the catalog. Check Updates for the verified release record.'
    : 'No studio-approved public download or demo is available yet.';

  root.innerHTML =
    '<div class="px-breadcrumb">' +
      '<button type="button" data-route="creations" aria-label="Back to all creations">← <span>ALL CREATIONS</span></button>' +
      '<span class="px-breadcrumb-divider" aria-hidden="true">/</span><span>' + esc(project.name).toUpperCase() + '</span>' +
      '<span class="px-breadcrumb-number">NAVIN STUDIO <em> / THE WORK</em></span></div>' +
    '<div class="px-hero" data-tone="' + esc(project.tone) + '">' +
      '<div class="px-copy"><div class="px-kicker"><span class="px-live-dot" aria-hidden="true"></span> THE CREATIVE FILE <span class="px-kicker-divider">/</span> ' + esc(project.type).toUpperCase() + '</div>' +
        '<h1 id="project-story-title" tabindex="-1">' + esc(project.name) + '</h1>' +
        '<p class="px-lead">' + esc(brief.opening) + '</p>' +
        '<div class="px-hero-actions"><a href="' + esc(project.repo) + '" class="px-button px-button-primary" target="_blank" rel="noopener noreferrer">Explore public source <span aria-hidden="true">↗</span></a>' +
        '<button type="button" class="px-button px-button-quiet" data-copy-project="' + esc(project.id) + '">Copy project link <span aria-hidden="true">⌁</span></button></div>' +
        '<span class="px-public-note">AN EDITORIAL DEVELOPMENT PREVIEW · NOT A PRODUCT RELEASE</span>' +
      '</div><div class="px-art" aria-hidden="true"><div class="px-art-orbit px-art-orbit-outer"></div><div class="px-art-orbit px-art-orbit-inner"></div>' +
        visual + '<span class="px-art-cross px-art-cross-a">+</span><span class="px-art-cross px-art-cross-b">+</span><span class="px-art-coordinate">N/S — ' + esc(project.id).toUpperCase() + '</span>' +
        '<div class="px-art-sheen"></div></div>' +
      '<div class="px-hero-bottom"><span>AN ORIGINAL NAVIN STUDIO PROJECT</span><span>STILL IN THE MAKING <b>↗</b></span></div>' +
    '</div>' +
    '<div class="px-facts" aria-label="Project information">' +
      '<div><span>CREATIVE TERRITORY</span><strong>' + esc(project.discipline) + '</strong></div>' +
      '<div><span>STUDIO STATUS</span><strong>' + esc(project.stage) + '</strong></div>' +
      '<div><span>CURRENT FOCUS</span><strong>' + esc(project.focus) + '</strong></div>' +
    '</div>' +
    '<div class="px-story-grid">' +
      '<section class="px-story-body"><span class="px-section-label">01 / THE IDEA</span><h2>Behind the <em>intention.</em></h2><p class="px-story-lede">' + esc(brief.thesis) + '</p>' +
        '<p class="px-story-support">' + esc(project.description) + '</p></section>' +
      '<aside class="px-aside"><span class="px-aside-eyebrow">A NOTE FROM THE STUDIO</span><span class="px-aside-quote" aria-hidden="true">“</span>' +
        '<blockquote>' + esc(brief.closer) + '</blockquote><span class="px-aside-sign">NAVIN STUDIO · CREATIVE NOTES</span></aside>' +
    '</div>' +
    '<section class="px-explore"><div class="px-section-head"><span class="px-section-label">02 / THE EXPLORATION</span>' +
      '<h2>Three directions. <em>One idea.</em></h2><p>These are creative focus areas, not promises of shipped features.</p></div>' +
      '<div class="px-facets">' + facets + '</div></section>' +
    '<section class="px-access"><div class="px-access-icon" aria-hidden="true">✳</div>' +
      '<div class="px-access-copy"><span class="px-section-label">03 / AVAILABILITY</span><h2>Made with care. <em>Shared when ready.</em></h2><p>' + esc(releaseNote) + '</p></div>' +
      '<button class="px-button px-button-outline" type="button" data-route="releases">Release philosophy <span aria-hidden="true">↗</span></button></section>' +
    '<div class="px-bottom-head"><div><span class="px-section-label">KEEP EXPLORING</span><h2>Elsewhere in <em>the universe.</em></h2></div>' +
      '<button type="button" class="px-all-link" data-route="creations">View all creations <span aria-hidden="true">→</span></button></div>' +
    '<div class="px-related">' + relatedMarkup + '</div>';
}

async function copyProjectLink(id) {
  if (!projects.some(project => project.id === id)) return;
  const url = new URL(location.href);
  url.hash = 'project/' + id;
  try {
    if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url.href);
    showToast('Project link copied');
  } catch (_) {
    showToast('Copy the project address from your browser address bar.');
  }
}

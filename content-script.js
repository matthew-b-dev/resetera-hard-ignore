const IGNORED_USERS_KEY = 'ignoredUsers';
const REVEALED_AUTHORS_KEY = 'revealedIgnoredAuthors';
const extensionApi =
  typeof browser !== 'undefined'
    ? browser
    : typeof chrome !== 'undefined'
      ? chrome
      : undefined;
const storage = extensionApi?.storage;
const isBrowserApi = typeof browser !== 'undefined';

console.log('ResetEra Hard Ignore: content script loaded', {
  url: location.href,
  browserApi: typeof browser !== 'undefined',
  chromeApi: typeof chrome !== 'undefined',
  storageAvailable: !!storage,
});

if (!storage) {
  console.error('ResetEra Hard Ignore: extension storage API is unavailable');
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase();
}

function storageGet(keys) {
  if (isBrowserApi) {
    return storage.local.get(keys);
  }
  return new Promise((resolve) => storage.local.get(keys, resolve));
}

function storageSet(items) {
  if (isBrowserApi) {
    return storage.local.set(items);
  }
  return new Promise((resolve) => storage.local.set(items, resolve));
}

function isIgnored(author, ignoredUsers) {
  if (!author) return false;
  return ignoredUsers.includes(normalizeName(author));
}

function hideThreadEntries(ignoredUsers) {
  const threadItems = document.querySelectorAll('.structItem[data-author]');
  threadItems.forEach((item) => {
    const author = item.dataset.author;
    if (isIgnored(author, ignoredUsers)) {
      console.log('Hiding thread entry for ignored user:', author);
      item.style.display = 'none';
    }
  });
}

function hideThreadPosts(ignoredUsers) {
  const posts = document.querySelectorAll(
    'article.message[data-author], .message[data-author]',
  );
  posts.forEach((post) => {
    const author = post.dataset.author;
    const hiddenState = post.dataset.rhHidden;
    if (isIgnored(author, ignoredUsers) && hiddenState !== 'revealed') {
      post.style.display = 'none';
      post.dataset.rhHidden = 'true';
      post.classList.remove('rh-ignored-revealed');
    }
  });
}

function hideIgnoredAuthorPosts(author) {
  const normalizedAuthor = normalizeName(author);
  const posts = document.querySelectorAll('[data-author]');
  posts.forEach((post) => {
    const postAuthor = normalizeName(post.dataset.author);
    if (postAuthor !== normalizedAuthor) {
      return;
    }
    post.style.display = 'none';
    post.dataset.rhHidden = 'true';
    post.classList.remove('rh-ignored-revealed');
    const banner = post.querySelector('.rh-ignored-post-banner');
    if (banner) {
      banner.remove();
      delete post.dataset.rhBannerAdded;
    }
  });
}

function ensureIgnoredPostStyle() {
  if (document.getElementById('rh-ignored-post-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'rh-ignored-post-style';
  style.textContent = `
    .rh-ignored-post-banner {
      background: rgba(255, 215, 0, 0.08);
      border-left: 4px solid #ffc107;
      color: #fff;
      font-size: 1.15rem;
      padding: 10px 12px;
      margin-bottom: 10px;
      border-radius: 0 0 6px 0;
      line-height: 1.4;
    }
    .rh-ignored-post-banner strong {
      color: #ffd966;
    }
    .rh-ignored-action {
      all: unset;
      display: inline-block;
      color: #8050bf;
      cursor: pointer;
      text-decoration: underline;
      font: inherit;
      font-size: 1.25rem;
      padding: 0;
      line-height: inherit;
      margin-top: 10px;
    }
    .rh-ignored-action:hover {
      text-decoration: none;
    }
  `;
  document.head.appendChild(style);
}

function insertIgnoredPostBanner(post) {
  if (post.dataset.rhBannerAdded === 'true') {
    return;
  }
  ensureIgnoredPostStyle();
  const bannerContainer =
    post.querySelector('.message-content') ||
    post.querySelector('.message-main') ||
    post.querySelector('.message-body') ||
    post;
  const banner = document.createElement('div');
  banner.className = 'rh-ignored-post-banner';

  const text = document.createElement('span');
  text.textContent =
    "You are ignoring this user through a browser extension. You chose to unhide this user's post for this thread only. ";
  const hideButton = document.createElement('button');
  hideButton.type = 'button';
  hideButton.className = 'rh-ignored-action';
  hideButton.textContent = "Hide this user's posts in this thread";
  hideButton.addEventListener('click', () => {
    const author = post.dataset.author;
    if (!author) {
      return;
    }
    hideIgnoredAuthorPosts(author);
    clearRevealedAuthor(currentThreadKey, author).catch((error) => {
      console.warn(
        'ResetEra Hard Ignore: failed to clear revealed author on hide action',
        author,
        error,
      );
    });
  });

  banner.appendChild(text);
  banner.appendChild(document.createElement('br'));
  banner.appendChild(hideButton);
  bannerContainer.insertBefore(banner, bannerContainer.firstChild);
  post.dataset.rhBannerAdded = 'true';
}

function revealIgnoredAuthorPosts(author) {
  const normalizedAuthor = normalizeName(author);
  const posts = document.querySelectorAll('[data-author]');
  let revealedAny = false;
  posts.forEach((post) => {
    const postAuthor = normalizeName(post.dataset.author);
    const hiddenState = post.dataset.rhHidden;
    const computedDisplay = window.getComputedStyle(post).display;
    if (postAuthor !== normalizedAuthor) {
      return;
    }
    if (hiddenState === 'true' || computedDisplay === 'none') {
      post.style.display = '';
      post.dataset.rhHidden = 'revealed';
      post.classList.add('rh-ignored-revealed');
      insertIgnoredPostBanner(post);
      revealedAny = true;
    }
  });
  if (revealedAny) {
    saveRevealedAuthor(currentThreadKey, author).catch((error) => {
      console.warn(
        'ResetEra Hard Ignore: failed to persist revealed author',
        author,
        error,
      );
    });
  }
}

function revealIgnoredPosts(ignoredUsers) {
  const posts = document.querySelectorAll('[data-rh-hidden="true"]');
  posts.forEach((post) => {
    if (isIgnored(post.dataset.author, ignoredUsers)) {
      post.style.display = '';
      post.dataset.rhHidden = 'revealed';
      insertIgnoredPostBanner(post);
    }
  });
}

function buildIgnoredQuoteNotice(block, ignoredUsers) {
  const quoteAuthor =
    block.dataset.quote || block.getAttribute('data-quote') || '';
  if (!isIgnored(quoteAuthor, ignoredUsers)) {
    return;
  }

  if (block.dataset.rhProcessed === 'true') {
    return;
  }
  block.dataset.rhProcessed = 'true';

  ensureIgnoredPostStyle();
  const contentArea = block.querySelector('.bbCodeBlock-content');
  if (!contentArea) {
    return;
  }

  const expandContent = contentArea.querySelector('.bbCodeBlock-expandContent');
  const expandLink = contentArea.querySelector('.bbCodeBlock-expandLink');
  const shrinkLink = contentArea.querySelector('.bbCodeBlock-shrinkLink');

  if (expandContent) {
    expandContent.style.display = 'none';
  }
  if (expandLink) {
    expandLink.style.display = 'none';
  }
  if (shrinkLink) {
    shrinkLink.style.display = 'none';
  }

  const notice = document.createElement('div');
  notice.className = 'rh-ignored-quote-notice';
  notice.textContent = 'You are ignoring content by this member. ';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rh-ignored-action';
  button.textContent = 'Show ignored content';
  button.addEventListener('click', () => {
    if (expandContent) {
      expandContent.style.display = '';
    }
    if (expandLink) {
      expandLink.style.display = '';
    }
    if (shrinkLink) {
      shrinkLink.style.display = '';
    }
    notice.remove();
    revealIgnoredPosts(ignoredUsers);
    if (quoteAuthor) {
      revealIgnoredAuthorPosts(quoteAuthor);
      saveRevealedAuthor(currentThreadKey, quoteAuthor).catch((error) => {
        console.warn(
          'ResetEra Hard Ignore: failed to persist revealed author on quote reveal',
          quoteAuthor,
          error,
        );
      });
    }
    block.classList.add('rh-ignored-quote-visible');
  });

  const sourceLink = block.querySelector('.bbCodeBlock-sourceJump');
  if (sourceLink && quoteAuthor) {
    sourceLink.addEventListener('click', () => {
      saveLocalRevealedAuthor(currentThreadKey, quoteAuthor);
      saveRevealedAuthor(currentThreadKey, quoteAuthor).catch((error) => {
        console.warn(
          'ResetEra Hard Ignore: failed to persist revealed author on source link click',
          quoteAuthor,
          error,
        );
      });
      revealIgnoredPosts(ignoredUsers);
      revealIgnoredAuthorPosts(quoteAuthor);
    });
  }

  notice.appendChild(button);
  contentArea.insertBefore(notice, contentArea.firstChild);
}

function processQuoteBlocks(ignoredUsers) {
  const quoteBlocks = document.querySelectorAll(
    'blockquote.bbCodeBlock, blockquote[data-quote], .bbCodeBlock--quote',
  );
  quoteBlocks.forEach((block) => buildIgnoredQuoteNotice(block, ignoredUsers));
}

function applyHardIgnore(ignoredUsers) {
  if (!ignoredUsers.length) {
    return;
  }

  hideThreadEntries(ignoredUsers);
  hideThreadPosts(ignoredUsers);
  processQuoteBlocks(ignoredUsers);
}

function observeChanges(ignoredUsers) {
  const observer = new MutationObserver(() => applyHardIgnore(ignoredUsers));
  observer.observe(document.body, { childList: true, subtree: true });
}

function getThreadKey() {
  const threadMatch = location.pathname.match(
    /\/threads\/[^/]+\.(\d+)(?:\/|$)/,
  );
  if (threadMatch) {
    return `thread-${threadMatch[1]}`;
  }
  const fallbackMatch = location.pathname.match(
    /\/threads\/[^/]+\/(\d+)(?:\/|$)/,
  );
  if (fallbackMatch) {
    return `thread-${fallbackMatch[1]}`;
  }
  return `page-${location.pathname}`;
}

function loadLocalRevealedAuthors() {
  try {
    const raw = localStorage.getItem('rhRevealedIgnoredAuthors');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn(
      'ResetEra Hard Ignore: failed to load local revealed authors',
      error,
    );
    return {};
  }
}

function saveLocalRevealedAuthor(threadKey, author) {
  if (!author) {
    return;
  }
  const normalized = normalizeName(author);
  const allRevealed = loadLocalRevealedAuthors();
  const authorList = Array.isArray(allRevealed[threadKey])
    ? allRevealed[threadKey]
    : [];
  if (!authorList.includes(normalized)) {
    authorList.push(normalized);
    allRevealed[threadKey] = authorList;
    try {
      localStorage.setItem(
        'rhRevealedIgnoredAuthors',
        JSON.stringify(allRevealed),
      );
    } catch (error) {
      console.warn(
        'ResetEra Hard Ignore: failed to save local revealed authors',
        error,
      );
    }
  }
}

function clearLocalRevealedAuthor(threadKey, author) {
  if (!author) {
    return;
  }
  const normalized = normalizeName(author);
  const allRevealed = loadLocalRevealedAuthors();
  const authorList = Array.isArray(allRevealed[threadKey])
    ? allRevealed[threadKey].filter((entry) => entry !== normalized)
    : [];
  if (authorList.length) {
    allRevealed[threadKey] = authorList;
  } else {
    delete allRevealed[threadKey];
  }
  try {
    localStorage.setItem(
      'rhRevealedIgnoredAuthors',
      JSON.stringify(allRevealed),
    );
  } catch (error) {
    console.warn(
      'ResetEra Hard Ignore: failed to clear local revealed author',
      error,
    );
  }
}

function clearRevealedAuthor(threadKey, author) {
  if (!author) {
    return Promise.resolve();
  }
  const normalized = normalizeName(author);
  clearLocalRevealedAuthor(threadKey, normalized);
  return storageGet([REVEALED_AUTHORS_KEY]).then((result) => {
    const allRevealed =
      result[REVEALED_AUTHORS_KEY] &&
      typeof result[REVEALED_AUTHORS_KEY] === 'object'
        ? result[REVEALED_AUTHORS_KEY]
        : {};
    const authorList = Array.isArray(allRevealed[threadKey])
      ? allRevealed[threadKey].filter((entry) => entry !== normalized)
      : [];
    if (authorList.length) {
      allRevealed[threadKey] = authorList;
    } else {
      delete allRevealed[threadKey];
    }
    return storageSet({ [REVEALED_AUTHORS_KEY]: allRevealed });
  });
}

function loadRevealedAuthors(threadKey) {
  const localRevealed = loadLocalRevealedAuthors();
  return storageGet([REVEALED_AUTHORS_KEY]).then((result) => {
    const allRevealed =
      result[REVEALED_AUTHORS_KEY] &&
      typeof result[REVEALED_AUTHORS_KEY] === 'object'
        ? result[REVEALED_AUTHORS_KEY]
        : {};
    const extList = Array.isArray(allRevealed[threadKey])
      ? allRevealed[threadKey]
      : [];
    const localList = Array.isArray(localRevealed[threadKey])
      ? localRevealed[threadKey]
      : [];
    return Array.from(new Set([...extList, ...localList]));
  });
}

function saveRevealedAuthor(threadKey, author) {
  if (!author) {
    return Promise.resolve();
  }
  const normalized = normalizeName(author);
  saveLocalRevealedAuthor(threadKey, normalized);
  return storageGet([REVEALED_AUTHORS_KEY]).then((result) => {
    const allRevealed =
      result[REVEALED_AUTHORS_KEY] &&
      typeof result[REVEALED_AUTHORS_KEY] === 'object'
        ? result[REVEALED_AUTHORS_KEY]
        : {};
    const authorList = Array.isArray(allRevealed[threadKey])
      ? allRevealed[threadKey]
      : [];
    if (!authorList.includes(normalized)) {
      authorList.push(normalized);
      allRevealed[threadKey] = authorList;
      return storageSet({ [REVEALED_AUTHORS_KEY]: allRevealed });
    }
    return Promise.resolve();
  });
}

function revealPersistedAuthors(ignoredUsers, threadKey) {
  return loadRevealedAuthors(threadKey).then((authors) => {
    if (!authors.length) {
      return;
    }
    authors.forEach((author) => {
      if (isIgnored(author, ignoredUsers)) {
        revealIgnoredAuthorPosts(author);
      }
    });
  });
}

function loadIgnoredUsers() {
  return storageGet([IGNORED_USERS_KEY]).then((result) => {
    const rawList = Array.isArray(result[IGNORED_USERS_KEY])
      ? result[IGNORED_USERS_KEY]
      : [];
    const normalized = rawList.map(normalizeName).filter(Boolean);
    return Array.from(new Set(normalized));
  });
}

const currentThreadKey = getThreadKey();

loadIgnoredUsers().then((ignoredUsers) => {
  applyHardIgnore(ignoredUsers);
  revealPersistedAuthors(ignoredUsers, currentThreadKey);
  observeChanges(ignoredUsers);
});

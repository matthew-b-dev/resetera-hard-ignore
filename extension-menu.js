const IGNORED_USERS_KEY = 'ignoredUsers';
const extensionApi =
  typeof browser !== 'undefined'
    ? browser
    : typeof chrome !== 'undefined'
      ? chrome
      : undefined;
const storage = extensionApi?.storage;
const tabsApi = extensionApi?.tabs;
const isBrowserApi = typeof browser !== 'undefined';
const storageAvailable = Boolean(storage?.local);

if (!storageAvailable) {
  console.warn('ResetEra Hard Ignore: extension storage API is unavailable');
}

function normalizeUserName(value) {
  return String(value || '').trim();
}

function storageGet(keys) {
  if (!storageAvailable) {
    return Promise.resolve({});
  }
  if (isBrowserApi) {
    return storage.local.get(keys);
  }
  return new Promise((resolve) => storage.local.get(keys, resolve));
}

function storageSet(items) {
  if (!storageAvailable) {
    return Promise.resolve();
  }
  if (isBrowserApi) {
    return storage.local.set(items);
  }
  return new Promise((resolve) => storage.local.set(items, resolve));
}

function getIgnoredUsers() {
  return storageGet([IGNORED_USERS_KEY]).then((result) => {
    const rawList = Array.isArray(result[IGNORED_USERS_KEY])
      ? result[IGNORED_USERS_KEY]
      : [];
    return Array.from(new Set(rawList.map(normalizeUserName).filter(Boolean)));
  });
}

function setIgnoredUsers(list) {
  const normalizedList = Array.from(
    new Set(list.map(normalizeUserName).filter(Boolean)),
  );
  return storageSet({ [IGNORED_USERS_KEY]: normalizedList });
}

function updateError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message || '';
  }
}

async function renderIgnoredList() {
  const container = document.getElementById('ignored-list');
  if (!container) {
    return;
  }

  const ignoredList = await getIgnoredUsers();
  container.innerHTML = '';

  if (!ignoredList.length) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = 'No users ignored yet.';
    emptyItem.style.opacity = '0.7';
    container.appendChild(emptyItem);
    return;
  }

  ignoredList.forEach((user) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = user;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', async () => {
      const nextList = (await getIgnoredUsers()).filter(
        (entry) => entry.toLowerCase() !== user.toLowerCase(),
      );
      await setIgnoredUsers(nextList);
      await renderIgnoredList();
      updateError('');
    });

    item.appendChild(label);
    item.appendChild(removeButton);
    container.appendChild(item);
  });
}

async function handleAddUser(event) {
  event.preventDefault();
  const input = document.getElementById('username-input');
  if (!input) {
    return;
  }

  const username = normalizeUserName(input.value);
  input.value = username;
  if (!username) {
    updateError('Please enter a username.');
    return;
  }

  const ignoredUsers = await getIgnoredUsers();
  const alreadyIgnored = ignoredUsers.some(
    (entry) => entry.toLowerCase() === username.toLowerCase(),
  );
  if (alreadyIgnored) {
    updateError('User is already in the ignore list.');
    return;
  }

  ignoredUsers.push(username);
  await setIgnoredUsers(ignoredUsers);
  input.value = '';
  updateError(`Added ${username}. Refresh the page to apply.`);
  await renderIgnoredList();
}

async function refreshActiveTab() {
  if (!tabsApi?.query || !tabsApi?.reload) {
    return;
  }

  try {
    const tabs = await tabsApi.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    if (tab?.id != null) {
      await tabsApi.reload(tab.id);
    }
  } catch (error) {
    console.warn(
      'ResetEra Hard Ignore: failed to refresh the active tab',
      error,
    );
    updateError('Could not refresh the active tab.');
  }
}

function setupEventListeners() {
  const form = document.getElementById('ignore-form');
  const refreshButton = document.getElementById('refresh-button');

  if (form) {
    form.addEventListener('submit', handleAddUser);
  }
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      refreshActiveTab().catch((error) => {
        console.warn('ResetEra Hard Ignore: refresh handler failed', error);
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderIgnoredList().catch((error) => {
    console.warn('ResetEra Hard Ignore: failed to render ignored list', error);
  });
});

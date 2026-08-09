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

if (!storage) {
  console.error('ResetEra Hard Ignore: extension storage API is unavailable');
}

function normalizeUserName(value) {
  return String(value || '').trim();
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

function getIgnoredUsers() {
  return storageGet([IGNORED_USERS_KEY]).then((result) => {
    const rawList = Array.isArray(result[IGNORED_USERS_KEY])
      ? result[IGNORED_USERS_KEY]
      : [];
    return rawList.map(normalizeUserName).filter(Boolean);
  });
}

function setIgnoredUsers(list) {
  return storageSet({ [IGNORED_USERS_KEY]: list });
}

function updateError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message || '';
}

async function renderIgnoredList() {
  const ignoredList = await getIgnoredUsers();
  const container = document.getElementById('ignored-list');
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
      renderIgnoredList();
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
  updateError('Added ' + username + '. Refresh the page to apply.');
  renderIgnoredList();
}

function refreshActiveTab() {
  if (!tabsApi) {
    return;
  }

  if (typeof tabsApi.query === 'function') {
    const queryArgs = { active: true, currentWindow: true };
    const callback = (tabs) => {
      if (tabs?.length) {
        const tab = tabs[0];
        if (typeof tabsApi.reload === 'function') {
          tabsApi.reload(tab.id);
        }
      }
    };

    const result = tabsApi.query(queryArgs, callback);
    if (result && typeof result.then === 'function') {
      result.then((tabs) => {
        if (tabs?.length && typeof tabsApi.reload === 'function') {
          tabsApi.reload(tabs[0].id);
        }
      });
    }
  }
}

function setupEventListeners() {
  document
    .getElementById('ignore-form')
    .addEventListener('submit', handleAddUser);
  document
    .getElementById('refresh-button')
    .addEventListener('click', refreshActiveTab);
}

window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderIgnoredList();
});

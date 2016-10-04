import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {examplesList} from 'examples-main/examples-list';

interface Folder {
  path: string;
  files: number[];
}

let cont = document.createElement('div');
cont.style.display = 'flex';
cont.style.flexDirection = 'column';
cont.style.position = 'absolute';
cont.style.top = '0px';
cont.style.left = '0px';
cont.style.bottom = '0px';
cont.style.right = '0px';

let header = document.createElement('div');
header.style.flexGrow = '0';
header.style.padding = '8px';
header.style.fontSize = '18px';
header.style.backgroundColor = '#f0f0f0';

cont.appendChild(header);
document.body.appendChild(cont);

let container = document.createElement('div');
container.style.flexGrow = '1';
container.id = 'container';
cont.appendChild(container);

function getFolders(examples: string[]) {
  let pathsMap = {};
  examples.forEach((item) => {
    let path = item.substr(0, item.lastIndexOf('/') + 1);
    let file = item.substr(path.length);

    let files = pathsMap[path] || (pathsMap[path] = []);
    files.push(file);
  });

  let folders = [];
  for (let path in pathsMap) {
    let files = pathsMap[path];
    files.sort();
    folders.push({path: path, files: files});
  }

  return folders;
}

let examples = examplesList.map((item) => item);
var folders = getFolders(examples);

let spaces = [];
while (spaces.length < 4)
  spaces.push(String.fromCharCode(160));

function moduleToOption(file) {
  return spaces.concat(file);
}

function optionToModule(option) {
  let pair = option.split('-').map((i) => parseInt(i, 10));
  return pair;
}

function renderFolders(parent: HTMLElement, folders: Folder[], sel: number[]) {
  let options = [];
  folders.forEach((folder, folderIdx) => {
    options.push(<option key={folderIdx} disabled={true}>{folder.path}</option>);
    folder.files.forEach((file, fileIdx) => {
      options.push(
        <option key={[folderIdx, fileIdx].join('-')} value={[folderIdx, fileIdx].join('-')}>
          {moduleToOption(file)}
        </option>);
    });
  });

  ReactDOM.render(<div style={{display: 'flex', flexDirection: 'row'}}>
    <span style={{color: 'gray'}}>Selected example:</span> <select defaultValue={sel.join('-')} style={{flexGrow: 1}} onChange={onSelectExample}>
      {options}
    </select>
  </div>, parent);
}

function parseSelectionFromUrl() {
  let selection = location.href.split('#')[1] || '';

  let params = selection.split('&');
  for (let n = 0; n < params.length; n++) {
    let keyVal = params[n].split('=');
    if (keyVal[0] == 'selection')
      return keyVal[1].split(':').map((value) => +value);
  }

  return [0, 0];
}

export function onSelectExample(event) {
  let folderFilePair = optionToModule(event.target.value);

  let selection = folderFilePair.join(':');
  try {
    window.history.pushState({
      folderIdx: folderFilePair[0],
      fileIdx: folderFilePair[1]
    }, 'example ' + selection, '#selection=' + selection);
    location.reload();
  } catch (e) {
    location.href = '#selection=' + selection;
  }
  loadExample(folderFilePair);
}

function loadExample(sel?: number[]) {
  sel = sel || parseSelectionFromUrl();
  let folder = folders[sel[0]];
  let module = folder.path + folder.files[sel[1]];

  try {
    requirejs([module]);
  } catch (e) {
    console.log(e);
  }
}

window.addEventListener('popstate', (event) => {
  location.reload();
});

let sel = parseSelectionFromUrl();
renderFolders(header, folders, sel);
loadExample(sel);

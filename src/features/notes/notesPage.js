import { notesConfig } from "../../config/notes.config.js";

const content = document.querySelector("#notes-content");
const navigation = document.querySelector("#notes-navigation");
const requestedId = new URLSearchParams(window.location.search).get("doc");
const documentId = notesConfig.documents[requestedId]
  ? requestedId
  : notesConfig.defaultDocumentId;
const activeDocument = notesConfig.documents[documentId];

navigation.innerHTML = Object.entries(notesConfig.documents)
  .map(([id, document]) => {
    const activeClass = id === documentId ? " is-active" : "";
    return `<a class="notes-link${activeClass}" href="/notes.html?doc=${id}">${document.label}</a>`;
  })
  .join("");

renderDocument(activeDocument);

async function renderDocument(noteDocument) {
  try {
    const response = await fetch(noteDocument.path);
    if (!response.ok) {
      throw new Error(`Failed to load ${noteDocument.path}: ${response.status}`);
    }

    const markdown = await response.text();
    content.innerHTML = window.marked.parse(markdown, {
      gfm: true,
      breaks: false,
    });
    document.title = `${noteDocument.label} | Pan's Mainpage`;
  } catch (error) {
    content.innerHTML = `
      <h1>Notes unavailable</h1>
      <p>The requested document could not be loaded.</p>
    `;
    console.error(error);
  }
}

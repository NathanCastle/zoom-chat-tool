var enableObsidianLinks = true;
var fileContents = "";
var htmlOutput = null;

function handleObsidianLinkChange(evt) {
  enableObsidianLinks = evt.checked;
  renderContent();
}

function onChange() {
  const fileInput = document.getElementById("upload-button");
  const selectedFile = fileInput.files[0];

  const outputView = document.getElementById("raw-file-contents");

  var reader = new FileReader();
  reader.onload = function (event) {
    fileContents = event.target.result;
    outputView.innerText = fileContents;
    renderContent();
  };
  reader.readAsText(selectedFile);
}
function renderContent() {
  let processed = convertToSchema(fileContents);
  let markdown = convertSchemaToMarkdown(processed);
  const markdownView = document.getElementById("markdown-contents");
  markdownView.innerText = markdown;

  let htmlOutputelement = convertSchemaToHtml(processed);
  let outputView = document.getElementById("html-output-view");
  outputView.innerHTML = "";
  outputView.appendChild(htmlOutputelement);
  htmlOutput = htmlOutputelement;
}

function convertSchemaToMarkdown(inputObj) {
  var output = "";

  for (var entry of inputObj) {
    if (entry.to !== "Everyone") {
      continue;
    }

    if (enableObsidianLinks === true) {
      output = `${output}\n- [[${entry.from}]]: ${entry.contents.trim()}`;
    } else {
      output = `${output}\n- **${entry.from}**: (${
        entry.timestamp
      }) ${entry.contents.trim()}`;
    }
  }
  return output;
}

function convertSchemaToHtml(inputObj) {
  var outputRoot = document.createElement("div");
  var unorderedList = document.createElement("ul");
  outputRoot.appendChild(unorderedList);
  for (var entry of inputObj) {
    if (entry.to !== "Everyone") {
      continue;
    }
    var li = document.createElement("li");
    var fromSpan = document.createElement("strong");
    fromSpan.innerText = entry.from;
    li.appendChild(fromSpan);
    let spacer = document.createElement("span");
    spacer.innerHTML = "&nbsp;";
    li.appendChild(spacer);
    let timestamp = document.createElement("span");
    timestamp.appendChild(document.createTextNode("("));
    let timestampValue = document.createElement("time");
    timestampValue.innerText = entry.timestamp;
    timestamp.appendChild(timestampValue);
    timestamp.appendChild(document.createTextNode("): "));
    li.appendChild(timestamp);
    let contents = document.createElement("span");
    contents.innerText = entry.contents;
    li.appendChild(contents);
    unorderedList.appendChild(li);
  }
  return outputRoot;
}

function convertToSchema(inputText) {
  let lines = inputText.split("\n");

  let statements = [];
  var statementInProgress = null;

  let timeRegex = /^(([0-9]{2})\:){2}([0-9]{2})/g;

  for (var line of lines) {
    if (timeRegex.test(line)) {
      if (statementInProgress != null) {
        statementInProgress.contents = statementInProgress.contents.trim();
        statements.push(statementInProgress);
      }
      statementInProgress = {
        timestamp: "",
        from: "",
        to: "",
        contents: "",
      };
      let fromParts = line.split(" From ", 2);
      statementInProgress.timestamp = fromParts[0];
      // TODO = handle cases where name contains ' to '
      let toParts = fromParts[1].split(" to ");
      statementInProgress.from = toParts[0];
      statementInProgress.to = toParts[1].split(":")[0];
    } else if (statementInProgress != null) {
      statementInProgress.contents = `${
        statementInProgress.contents
      }\n${line.trim()}`;
    }
  }
  return statements;
}

async function handleCopyHtml(evt) {
  console.dir(navigator.clipboard);
  if (navigator.clipboard) {
    try {
        const blob = new Blob([htmlOutput.innerHTML], {type: 'text/html'})
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
        }),
      ]);
      return;
    } catch (ex) {
      console.dir(ex);
    }
  }
  // fallback
  let range = document.createRange();
  let contentNode = document.getElementById("html-output-view");
  range.selectNodeContents(contentNode);
  let selection = window.getSelection();

  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("copy");
}

document.getElementById('copy-btn').addEventListener('click', handleCopyHtml);
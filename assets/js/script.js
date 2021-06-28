const BOOKS_DATA_KEY = "BOOKS_DATA";
const overlayNode = { form: null, delete: null };

const DataChangedEvent = new Event("dataChange");

const overlay = document.querySelector(".overlay");
const controlComplete = document.querySelector("#control-complete");
const controlNotComplete = document.querySelector("#control-not-complete");
const readNotCompleted = document.querySelector("#sedang-dibaca");
const readCompleted = document.querySelector("#sudah-dibaca");
const progress = document.querySelector("#progress");
const nBooks = document.querySelector("#n-buku");
const nBooksRead = document.querySelector("#n-sudah-baca");
const searchBox = document.querySelector(".search input");

function objectChecker(obj, filter) {
  const filterLower = filter.toLowerCase();

  return (
    obj.title.toLowerCase().indexOf(filterLower) >= 0 ||
    obj.author.toLowerCase().indexOf(filterLower) >= 0 ||
    obj.year.toString().indexOf(filterLower) >= 0
  );
}

function fetchData() {
  return JSON.parse(localStorage.getItem(BOOKS_DATA_KEY)) ?? [];
}

function updateData(newDB) {
  try {
    localStorage.setItem(BOOKS_DATA_KEY, JSON.stringify(newDB ?? []));
    return true;
  } catch {
    return false;
  }
}

function filterData(dataset, filter) {
  return dataset.filter((data) => objectChecker(data, filter));
}

function splitData(dataset) {
  const splittedData = [[], []];

  dataset.forEach((data) => {
    if (!data.isComplete) {
      splittedData[0].push(data);
    } else {
      splittedData[1].push(data);
    }
  });

  return splittedData;
}

function addData(data) {
  const newData = { ...data, id: `B${new Date().getTime()}` };
  const newDB = [...fetchData(), newData];

  const result = updateData(newDB);
  document.dispatchEvent(DataChangedEvent);

  return result;
}

function editData(id, newData) {
  const newDB = fetchData().reduce((lastData, val) => {
    if (val.id === id) {
      return [...lastData, { ...val, ...newData }];
    } else {
      return [...lastData, val];
    }
  }, []);

  const status = updateData(newDB);
  document.dispatchEvent(DataChangedEvent);

  return status;
}

function deleteData(id) {
  const newDB = fetchData().filter(({ id: dataID }) => dataID !== id);

  const status = updateData(newDB);
  document.dispatchEvent(DataChangedEvent);

  return status;
}

function getDataByID(id) {
  const data = fetchData();
  return data.filter(({ id: dataId }) => id === dataId)[0];
}

function highlight(text, query) {
  if (query === "") {
    return text;
  } else {
    const data = text.toString();
    const regex = new RegExp(query, "gi");

    let result = "",
      i,
      prev = 0;
    while ((i = regex.exec(text))) {
      result += data.slice(prev, i.index);
      result += `<mark>${i[0]}</mark>`;
      prev = regex.lastIndex;
    }

    result += data.slice(prev);

    return result;
  }
}

function elementBuilder(tag, classes = null, children = null, attributes = {}) {
  const el = document.createElement(tag);

  if (el) {
    if (typeof classes === "string") {
      el.className = classes;
    }

    if (Array.isArray(children)) {
      children.forEach((child) => el.append(child));
    } else if (typeof children === "string") {
      el.innerHTML = children;
    }

    for (const attributeName in attributes) {
      el.setAttribute(attributeName, attributes[attributeName]);
    }
  }

  return el;
}

function bookBuilder({ id, title, author, year, isComplete }) {
  const editHandler = () => openEditDialog(id);
  const deleteHandler = () => {
    openDeleteDialog(id);
  };
  const completedToggler = () => {
    editData(id, { isComplete: !isComplete });
  };

  const titleEl = elementBuilder("p", "title", title);
  const pengarangEl = elementBuilder("p", "pengarang", author);
  const tahunEl = elementBuilder("p", "tahun", year.toString());
  const bookEl = elementBuilder("div", "book-description", [
    titleEl,
    pengarangEl,
    tahunEl,
  ]);

  let controlsEl;
  const imgEdit = elementBuilder("img", null, null, {
    src: "assets/img/edit.png",
    alt: "Edit Buku",
  });
  const controlEdit = elementBuilder("div", "control", [imgEdit], {
    title: "Edit buku",
  });
  controlEdit.addEventListener("click", editHandler);

  const imgDelete = elementBuilder("img", null, null, {
    src: "assets/img/hapus-data.png",
    alt: "Hapus data",
  });

  const controlDelete = elementBuilder("div", "control", [imgDelete]);
  controlDelete.addEventListener("click", deleteHandler);

  if (!isComplete) {
    const imgCompleted = elementBuilder("img", null, null, {
      src: "assets/img/tandai-selesai-dibaca.png",
      alt: "Selesai dibaca",
    });

    const controlCompleted = elementBuilder("div", "control", [imgCompleted], {
      title: "Tandai selesai dibaca",
    });

    controlCompleted.addEventListener("click", completedToggler);

    controlsEl = elementBuilder("div", "controls", [
      controlEdit,
      controlCompleted,
      controlDelete,
    ]);
  } else {
    const imgUnCompleted = elementBuilder("img", null, null, {
      src: "assets/img/tandai-sedang-dibaca.png",
      alt: "Sedang dibaca",
    });

    const controlUnCompleted = elementBuilder(
      "div",
      "control",
      [imgUnCompleted],
      {
        title: "Tandai sedang dibaca",
      }
    );

    controlUnCompleted.addEventListener("click", completedToggler);

    controlsEl = elementBuilder("div", "controls", [
      controlEdit,
      controlUnCompleted,
      controlDelete,
    ]);
  }

  return elementBuilder("div", "book", [bookEl, controlsEl]);
}

function openEditDialog(id) {
  overlay.style.display = "flex";
  const data = getDataByID(id);

  overlayNode.form.setEditMode(true);
  overlayNode.form.setStateData(data);

  overlay.append(overlayNode.form);
}

function openAddDataDialog(isComplete = false) {
  overlay.style.display = "flex";
  overlayNode.form.setStateData({ isComplete });
  overlayNode.form.setEditMode(false);
  overlay.append(overlayNode.form);
}

function openDeleteDialog(id) {
  overlayNode.delete.setID(id);

  overlay.style.display = "flex";
  overlay.append(overlayNode.delete);
}

function formDialogGenerator() {
  overlayNode.form = overlay.children[0].cloneNode(true);

  const formInput = overlayNode.form.querySelectorAll("input");
  const formEl = overlayNode.form.querySelector("form");

  let formStateData, EditMode;

  const cleanForm = () => {
    formStateData = {};
    formEl.reset();
  };

  overlayNode.form.setStateData = (data) => {
    formStateData = { ...formStateData, ...data };

    formInput.forEach((el) => {
      const name = el.name;
      if (name !== "isComplete") {
        el.value = formStateData[name] ?? "";
      } else {
        el.checked = formStateData[name];
      }
    });
  };

  overlayNode.form.setEditMode = (isEditMode) => {
    const h2 = overlayNode.form.querySelector("h2");
    const button = overlayNode.form.querySelector("button");

    if (isEditMode) {
      h2.innerText = "Edit Data";
      button.innerText = "Edit Data";
    } else {
      h2.innerText = "Tambah Data";
      button.innerText = "Tambah Data";
    }

    EditMode = isEditMode;
  };

  formInput.forEach((input) => {
    input.addEventListener("change", (e) => {
      const name = e.target.name;
      if (name === "isComplete") {
        formStateData = {
          ...formStateData,
          [name]: e.target.checked,
        };
      } else if (name === "year") {
        const value = parseInt(e.target.value);
        formStateData = {
          ...formStateData,
          [name]: Number.isNaN(value) ? 0 : value,
        };
      } else {
        formStateData = { ...formStateData, [name]: e.target.value };
      }
    });
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();

    if (EditMode) {
      const { id, ...data } = formStateData;
      editData(id, data);
    } else {
      const data = formStateData;
      addData(data);
    }

    cleanForm();
    overlay.style.display = "none";
    overlay.innerHTML = "";
  });

  const formQuit = overlayNode.form.querySelector("#form-close");
  formQuit.addEventListener("click", () => {
    overlay.style.display = "none";
    overlay.innerHTML = "";

    formStateData = {};
    cleanForm();
  });
}

function deleteDialogGenerator() {
  overlayNode.delete = overlay.children[1].cloneNode(true);
  let stateID = 0;

  overlayNode.delete.setID = (id) => {
    stateID = id;
  };

  const cancelButton = overlayNode.delete.querySelector(".link");
  cancelButton.addEventListener("click", () => {
    overlay.style.display = "none";
    overlay.innerHTML = "";
  });

  const destroyButton = overlayNode.delete.querySelector(".destroy");
  destroyButton.addEventListener("click", () => {
    deleteData(stateID);

    overlay.style.display = "none";
    overlay.innerHTML = "";
  });

  const closeButton = overlayNode.delete.querySelector("#form-close");
  closeButton.addEventListener("click", () => {
    overlay.style.display = "none";
    overlay.innerHTML = "";
  });
}

function changeIndicator(notCompletedCount, CompletedCount) {
  const totalBooks = notCompletedCount + CompletedCount;
  nBooks.innerText = totalBooks;
  nBooksRead.innerText = CompletedCount;

  progress.style.width = `${
    totalBooks ? (CompletedCount / totalBooks) * 100 : 0
  }%`;
}

function SearchBooksRender(filter) {
  const filteredData = filterData(fetchData(), filter);
  const highlighted = filteredData.map((data) => ({
    ...data,
    title: highlight(data.title, filter),
    author: highlight(data.author, filter),
    year: highlight(data.year, filter),
  }));

  const [dataNotComplete, dataCompleted] = splitData(highlighted);
  const result = [
    dataNotComplete.map((data) => bookBuilder(data)),
    dataCompleted.map((data) => bookBuilder(data)),
  ];

  render(result);
}

function BookRender() {
  const data = fetchData();
  const [notCompleted, Completed] = splitData(data);

  const renderObject = [
    notCompleted.map((el) => bookBuilder(el)),
    Completed.map((el) => bookBuilder(el)),
  ];

  render(renderObject);
  changeIndicator(notCompleted.length, Completed.length);
}

function render(renderObject) {
  const [notCompleted, completed] = renderObject;
  readNotCompleted.innerHTML = "";
  readCompleted.innerHTML = "";

  notCompleted.forEach((el) => readNotCompleted.append(el));
  completed.forEach((el) => readCompleted.append(el));
}

window.addEventListener("DOMContentLoaded", () => {
  formDialogGenerator();
  deleteDialogGenerator();
  overlay.innerHTML = "";
});

controlComplete.addEventListener("click", () => {
  openAddDataDialog(true);
});

controlNotComplete.addEventListener("click", () => {
  openAddDataDialog();
});

document.addEventListener("dataChange", () => {
  BookRender();
});

searchBox.addEventListener("keyup", (e) => {
  SearchBooksRender(e.target.value);
});

document.dispatchEvent(DataChangedEvent);

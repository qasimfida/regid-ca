// Initially hide the previous button
document.getElementById("prevButton").style.display = "none";
const chapters = [
  { id: "introduction", title: "Introduction" },
  { id: "chapter-1", title: "Chapter 1" },
  { id: "chapter-2", title: "Chapter 2" },
  { id: "chapter-3", title: "Chapter 3" },
];
let currentChapterIndex = 0;

function showPrevious() {
  if (currentChapterIndex > 0) {
    currentChapterIndex--;
    showContent(chapters[currentChapterIndex]);
  }
}

const showNext = () => {
  currentChapterIndex =
    currentChapterIndex === chapters.length - 1 ? 0 : currentChapterIndex + 1;
  showContent(chapters[currentChapterIndex]);
};

const showContent = (chapter) => {
  // Hide all content sections
  document
    .querySelectorAll(".content-section")
    .forEach((section) => (section.style.display = "none"));

  // Show the selected content
  const selectedContent = document.getElementById(chapter?.id);
  if (selectedContent) {
    selectedContent.style.display = "block";

    // Update visibility of previous and next buttons
    document.getElementById("prevButton").style.display =
      currentChapterIndex === 0 ? "none" : "flex";
    document.getElementById("nextButton").style.display =
      currentChapterIndex === chapters.length - 1 ? "none" : "flex";

    // Update next and previous button texts
    document.getElementById("nextButtonText").textContent =
      currentChapterIndex === chapters.length - 1
        ? chapters[0].title
        : chapters[currentChapterIndex + 1].title;
    document.getElementById("prevButtonText").textContent =
      chapters[currentChapterIndex - 1].title;
  }
};

function uploadImage() {
  let input = document.getElementById("image");
  let preview = document.getElementById("imagePreview");

  if (input.files && input.files[0]) {
    var reader = new FileReader();

    reader.onload = function (e) {
      let img = document.createElement("img");
      img.setAttribute("src", e.target.result);
      img.setAttribute("alt", "Image Preview");

      // Clear existing content before appending the new image element
      preview.innerHTML = "";
      preview.appendChild(img);
    };

    reader.readAsDataURL(input.files[0]);
  } else {
    // Clear the image preview when no file is selected
    preview.innerHTML = "";
  }
}

// add book functionality

let currentIndex = -1;
let itemIdCounter = 0;

// Clear modal content when hidden
const modal = new bootstrap.Modal(document.getElementById("exampleModal"));
modal._element.addEventListener("hidden.bs.modal", function () {
  document.getElementById("modalForm").reset();
  document.getElementById("image").value = "";
  document.getElementById("imagePreview").innerHTML = "";
  currentIndex = -1;
});

const deleteConfirmationModal = new bootstrap.Modal(
  document.getElementById("deleteConfirmationModal")
);
const addChapterModal = new bootstrap.Modal(
  document.getElementById("addChapterModal")
);
modal._element.addEventListener("hidden.bs.modal", function () {
  document.getElementById("image").value = "";
  document.getElementById("imagePreview").innerHTML = "";
  document.getElementById("modalForm").reset();
  currentIndex = -1;
});

// Function to add or update an item in the list
function saveItem() {
  const itemName = document.getElementById("itemName").value;
  const itemDescription = document.getElementById("itemDescription").value;
  const creditBy = document.getElementById("creditby").value;
  const bookImage = document.getElementById("image").value;
  const image = document.getElementById("imagePreview");
  // console.log({ image: image.src });

  if (currentIndex === -1) {
    // Adding a new item
    addItemToList(itemName, itemDescription, creditBy, bookImage);
  } else {
    // Editing an existing item
    updateItem(itemName, itemDescription, creditBy, "", currentIndex);
  }

  // Reset the form
  document.getElementById("modalForm").reset();
  document.getElementById("image").value = "";
  currentIndex = -1;

  modal.hide();
}

// Event listener for form submission
document.getElementById("modalForm").addEventListener("submit", function (e) {
  e.preventDefault();
  saveItem();
});

// Function to add a new item to the list
function addItemToList(name, description, creditBy, bookImage) {
  const itemList = document.getElementById("itemList");
  const li = document.createElement("li");
  const itemId = "item_" + itemIdCounter++;
  li.id = itemId;
  li.className =
    "list-group-item d-flex justify-content-between align-items-center";
  li.innerHTML = `
  <span class="book-name" onclick="showBookDetails('${name}', '${description}', '${creditBy}', '${bookImage}')">${name}</span>
    <div class="dropdown">
      <button class="btn  btn-sm dropdown_btn dropdown-toggle" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
      <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
      />
    </svg>
      </button>
      <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <li><a class="dropdown-item" href="#" onclick="editItem('${itemId}', '${name}', '${description}', '${creditBy}','${bookImage}')">Edit</a></li>
        <li><a class="dropdown-item" href="#" onclick="showDeleteConfirmation('${itemId}')">Delete</a></li>
      </ul>
    </div>`;

  itemList.appendChild(li);
}

// Function to edit an existing item
function editItem(itemId, name, description, creditBy, bookImage) {
  // Fill the modal with existing values
  document.getElementById("itemName").value = name;
  document.getElementById("itemDescription").value = description;
  document.getElementById("creditby").value = creditBy;
  // document.getElementById("image").value = bookImage;
  // uploadImage();

  // let preview = document.getElementById("imagePreview");
  // preview.innerHTML = '<img src="' + bookImage + '" alt="Image Preview">';
  console.log("bookImage", bookImage);
  let preview = document.getElementById("imagePreview");
  let img = document.createElement("img");
  img.setAttribute("src", bookImage);
  img.setAttribute("alt", "Image Preview");
  // Clear existing content before appending the new image element
  preview.innerHTML = "";
  preview.appendChild(img);

  currentIndex = findItemIndex(itemId);

  // Show the modal
  modal.show();
}

// Function to update an item in the list
function updateItem(name, description, creditBy, bookImage, index) {
  const itemList = document.getElementById("itemList");
  const li = itemList.children[index];
  const itemId = li.id; // Get the existing item's id
  li.innerHTML = `
    <span class="book-name" onclick="showBookDetails('${name}', '${description}', '${creditBy}', '${bookImage}')">${name}</span>
    <div class="dropdown">
      <button class="btn dropdown_btn " type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
      <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
          />
      </svg>
      </button>
      <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <li><a class="dropdown-item" href="#" onclick="editItem('${itemId}', '${name}', '${description}', '${creditBy}','${bookImage}')">Edit</a></li>
        <li><a class="dropdown-item" href="#" onclick="showDeleteConfirmation('${itemId}')">Delete</a></li>
      </ul>
    </div>`;
}

// Function to delete an item from the list
function deleteItem(itemId) {
  // console.log("itemId", itemId);

  const li = document.getElementById(itemId);
  console.log("li", li);
  li.parentNode.removeChild(li);
  deleteConfirmationModal.hide();
}
showBookList();
// Function to show delete confirmation modal
function showDeleteConfirmation(itemId) {
  deleteConfirmationModal.show();

  // Set up event listener for delete confirmation button
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", function () {
      deleteItem(itemId);
    });
}

// Function to find the index of an item in the list
function findItemIndex(itemId) {
  const itemList = document.getElementById("itemList");
  for (let i = 0; i < itemList.children.length; i++) {
    if (itemList.children[i].id === itemId) {
      return i;
    }
  }
  return -1;
}

// Function to update book details content
function updateBookDetails(name) {
  const bookDetailsContent = document.getElementById("bookDetailsContent");

  // Clear existing content
  bookDetailsContent.innerHTML = "";

  // Create the book details header
  const detailsHeader = document.createElement("div");
  detailsHeader.className = "book_detils_header";

  const backButton = document.createElement("button");
  backButton.className = "btn back_button";
  backButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512">
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/>
    </svg>`;
  backButton.addEventListener("click", function () {
    showBookList();
  });

  const bookName = document.createElement("h3");
  bookName.className = "book_name_value";
  bookName.textContent = name;

  detailsHeader.appendChild(backButton);
  detailsHeader.appendChild(bookName);

  // Create the "Add a Chapter" button
  const addChapterButton = document.createElement("button");
  addChapterButton.className = "btn add_chapter_button";
  addChapterButton.setAttribute("data-bs-toggle", "modal");
  addChapterButton.setAttribute("data-bs-target", "#addChapterModal");
  addChapterButton.textContent = "Add a Chapter";
  addChapterButton.addEventListener("click", function () {
    // For now, let's just open the modal
    document.getElementById("chapterForm").reset();
    addChapterModal.show();
  });

  // Create the accordion for chapters
  const accordion = document.createElement("div");
  accordion.className = "accordion";
  accordion.id = "accordionExample";

  // Append the created elements to the book details content
  bookDetailsContent.appendChild(detailsHeader);
  bookDetailsContent.appendChild(addChapterButton);
  bookDetailsContent.appendChild(accordion);
}

// Function to show book details
function showBookDetails(name, description, creditBy, bookImage) {
  updateBookDetails(name);
  document.getElementById("bookList").style.display = "none";
  document.getElementById("bookDetails").style.display = "block";
}

// Function to show book list
function showBookList() {
  document.getElementById("bookDetails").style.display = "none";
  document.getElementById("bookList").style.display = "block";
}

// Function to add a new chapter
function saveChapter() {
  const chapterTitle = document.getElementById("chapterTitle").value.trim();

  // Check if the chapterTitle is empty
  if (!chapterTitle) {
    return;
  }

  // Add the chapter to the list
  addChapterToList(chapterTitle);

  // Reset the form
  document.getElementById("chapterForm").reset();

  // Hide the modal
  addChapterModal.hide();
}
let chapterIdCounter = 0;

// Function to add a new chapter to the accordion
function addChapterToList(chapterTitle) {
  const accordion = document.getElementById("accordionExample");
  const chapterId = "chapter_" + chapterIdCounter++;
  const newItem = `
    <div class="accordion-item" id="${chapterId}">
      <h2 class="accordion-header" id="heading${chapterId}">
        <button class="accordion-button collapsed add_chapter_accordion" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${chapterId}" aria-expanded="false" aria-controls="collapse${chapterId}">
          ${chapterTitle} ${generateChapterDropdown(chapterId, chapterTitle)}
        </button>
      </h2>
      <div id="collapse${chapterId}" class="accordion-collapse collapse" aria-labelledby="heading${chapterId}" data-bs-parent="#accordionExample">
        <div class="accordion-body">
          This is the content of ${chapterTitle}.
        </div>
      </div>
    </div>
  `;
  accordion.insertAdjacentHTML("beforeend", newItem);
}

// Function to generate HTML for chapter dropdown
function generateChapterDropdown(chapterId, chapterTitle) {
  return `
    <div class="dropdown">
      <button class="btn dropdown_btn " type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <!-- SVG Path for dropdown icon -->
        </svg>
      </button>
      <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <li><a class="dropdown-item" href="#" onclick="editChapter('${chapterId}', '${chapterTitle}')">Edit</a></li>
        <li><a class="dropdown-item" href="#" onclick="chapterDeleteConfirmation('${chapterId}')">Delete</a></li>
      </ul>
    </div>
  `;
}
// my code
// Function to edit a chapter
function editChapter(chapterId, chapterTitle) {
  console.log("chapterId", chapterId);
  // Fill the modal with existing values
  document.getElementById("chapterTitle").value = chapterTitle;

  currentIndex = findChapterIndex(chapterId);

  // Clear the accordion content for the specific chapter
  const chapterElement = document.getElementById(chapterId);
  chapterElement.innerHTML = "";

  // Show the modal
  addChapterModal.show();
}

// Function to delete a chapter
function deleteChapter(chapterId) {
  const chapterElement = document.getElementById(chapterId);
  chapterElement.parentNode.parentNode.removeChild(chapterElement.parentNode);
  deleteConfirmationModal.hide();
}
// Function to show delete confirmation modal for chapters
function chapterDeleteConfirmation(chapterId) {
  deleteConfirmationModal.show();

  // Set up event listener for delete confirmation button
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", function () {
      deleteChapter(chapterId);
    });
}

// Function to find the index of a chapter in the list
function findChapterIndex(chapterId) {
  const accordion = document.getElementById("accordionExample");
  for (let i = 0; i < accordion.children.length; i++) {
    if (accordion.children[i].id === chapterId) {
      return i;
    }
  }
  return -1;
}

const newItem = `
  <div class="dropdown">
    <button class="btn dropdown_btn " type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <!-- SVG Path for dropdown icon -->
      </svg>
    </button>
    <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
      <li><a class="dropdown-item" href="#" onclick="editChapter('${chapterId}', '${chapterTitle}')">Edit</a></li>
      <li><a class="dropdown-item" href="#" onclick="chapterDeleteConfirmation('${chapterId}')">Delete</a></li>
    </ul>
  </div>
`;

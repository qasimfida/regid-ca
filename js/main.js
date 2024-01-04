// GLOBAL VARIABLES
let selectedBook = 0;
let selectedChapter = 0;
let selectedSection = 0;
let activeSection = 0;
let activeChapter = 0;
let itemIdCounter = 0;

var quill = new Quill("#editor", {
	theme: "snow",
	modules: {
		toolbar: ["citation"],
	},
});

const base_url = "http://localhost:8080/books";

async function makeRequest(url, method = "GET", body = null, isFormData = false) {
	const options = { method };
	debugger;
	if (body) {
		if (isFormData) {
			// For FormData, just set the body without JSON.stringify
			options.body = body;
		} else {
			options.body = JSON.stringify(body);
			const header = {
				"Content-Type":"application/json"
			}
			options["headers"] = header
		}
	}

	try {
		const response = await fetch(`${base_url}${url}`, options);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (err) {
		console.error("HTTP request failed:", err);
		throw err;
	}
}

const APIS = {
	fetchBooks: () => makeRequest(`/books`),
	fetchBook: (id) => makeRequest(`/books/${id}`),
	addNewBook: (payload) => makeRequest("/books", "POST", payload, true),
	updateBook: (id, payload, isFormData) => makeRequest(`/books/${id}`, "PUT", payload, isFormData),
	deleteBook: (id) => makeRequest(`/book/${id}`, "DELETE"),
	fetchChapters: (id) => makeRequest(`/chapter/${id}`),
};

async function addNewBook(payload) {
	try {
		const res = await APIS.addNewBook(payload);
		console.log("Book added:", res);
		return res;
	} catch (err) {
		console.error("Error adding book:", err);
	}
}
async function deleteBook(id) {
	try {
		const res = await APIS.deleteBook(id);
		console.log("Book deleted:", res);
		return res;
	} catch (err) {
		console.error("Error deleting book:", err);
	}
}

// BOOKS CRUD

const modal = new bootstrap.Modal(document.getElementById("addBookModal"));
const addChapterModal = new bootstrap.Modal(document.getElementById("addChapterModal"));
const addSectionModal = new bootstrap.Modal(document.getElementById("addSectionModal"));

modal._element.addEventListener("hidden.bs.modal", function () {
	document.getElementById("modalForm").reset();
	document.getElementById("image").value = "";
	document.getElementById("imagePreview").innerHTML = "";
	selectedBook = 0;
});
modal._element.addEventListener("hidden.bs.modal", function () {
	document.getElementById("image").value = "";
	document.getElementById("imagePreview").innerHTML = "";
	document.getElementById("modalForm").reset();
	selectedBook = 0;
});

// Function to add or update an item in the list
async function saveBook() {
	let books = JSON.parse(sessionStorage.getItem("books") || "[]");

	const formData = new FormData();
	let isFormData = false;
	const image = document.getElementById("image");
	if (image?.files && image?.files?.[0]) {
		isFormData = true;
		formData.append("image", image?.files?.[0]);
		console.log({ img: image?.files?.[0] });
	}

	const book_title = document.getElementById("itemName").value;
	const description = document.getElementById("itemDescription").value;
	const author = document.getElementById("creditby").value;

	formData.append("book_title", book_title);
	formData.append("description", description);
	formData.append("author", author);

	try {
		let res;
		if (selectedBook) {
			// Update the existing book
			res = await APIS.updateBook(
				selectedBook,
				isFormData ? formData : { book_title, description, author },
				isFormData
			);
			console.log("Book updated:", res);

			// Update the local books array with the updated book
			// (Assuming `books` is an array of book objects stored in sessionStorage)
		} else {
			// Add a new book
			res = await APIS.addNewBook(formData);
			console.log("Book added:", res);

			// Add the new book to the local books array
			// (Assuming `books` is an array of book objects stored in sessionStorage)
		}
		if (res.success) {
			showBookList();
			document.getElementById("modalForm").reset();
			document.getElementById("image").value = "";
			selectedBook = 0;
			// modal.hide();
		}
	} catch (err) {
		console.error("Error saving book:", err);
	}
}

// Function to add a new item to the list
function addBook(book) {
	const { book_title, image, id } = book;
	const itemList = document.getElementById("book-list");
	const li = document.createElement("li");
	console.log({ a: base_url + "/" + image });
	li.id = id;
	li.className = "list-group-item d-flex justify-content-between align-items-center";
	li.innerHTML = `
		<span class="book-name d-flex w-100 justify-content-between" >
			<span onclick="showBookDetails('${id}')" >
				<span> <img height="40px" width="40px" style="border-radius: 10px" src="${
					base_url + "/" + image
				}"/> </span>
				<span> ${book_title} </span>
			</span>
			<div class="dropdown">
				<button class="btn  btn-sm dropdown_btn dropdown-toggle" type="button" id="chapterDropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
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
				<ul class="dropdown-menu" aria-labelledby="chapterDropdownMenuButton">
					<li><a class="dropdown-item" href="#" onclick="editBook('${book.id}','${book.book_title}','${
		book.description
	}', '${book.bookImage}','${book.creditBy}')">Edit</a></li>
					<li><a class="dropdown-item" href="#" onclick="showDeleteConfirmation('${id}')">Delete</a></li>
				</ul>
			</div>
		</span>
	`;

	itemList.appendChild(li);
}

// Function to edit an existing item
async function editBook(id) {
	const res = await APIS.fetchBook(id);
	if (res.success) {
		const { author, book_title, description, image } = res.data.book;
		console.log({ res });
		selectedBook = id;
		document.getElementById("itemName").value = book_title;
		document.getElementById("itemDescription").value = description;
		document.getElementById("creditby").value = author;
		// document.getElementById("image").value =  base_url + "/" + image;

		let preview = document.getElementById("imagePreview");
		let img = document.createElement("img");
		img.setAttribute("src", base_url + "/" + image);
		img.setAttribute("alt", "Image Preview");
		preview.innerHTML = "";
		preview.appendChild(img);

		modal.show();
	} else {
		alert("Failed to fetch book");
	}
}

// Function to update a book in the list
function updateBook(book, index) {
	const { id, name, description, creditBy, bookImage } = book;

	const itemList = document.querySelector(`#book-list #${index}`);
	const li = itemList.children[index];

	li.innerHTML = `
    <span class="book-name" onclick="showBookDetails('${id}')">${name}</span>
    <div class="dropdown">
      <button class="btn dropdown_btn " type="button" id="bookDropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
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
      <ul class="dropdown-menu" aria-labelledby="bookDropdownMenuButton">
        <li><a class="dropdown-item" href="#" onclick="editBook(${book})">Edit</a></li>
        <li><a class="dropdown-item" href="#" onclick="showDeleteConfirmation('${index}')">Delete</a></li>
      </ul>
    </div>`;
}

// Function to delete a book from the list
async function deleteBook(bookId) {
	const res = await APIS.deleteBook(bookId);
	console.log({ res }, "DELETE");
	let books = JSON.parse(sessionStorage.getItem("books") || []);
	books = books.filter((book) => `${book.id}` !== itemId);
	sessionStorage.setItem("books", JSON.stringify(books));
	deleteConfirmationModal.hide();
	showBookList();
}

// Event listener for form submission
document.getElementById("modalForm").addEventListener("submit", function (e) {
	e.preventDefault();
	saveBook();
});

showBookList();

// CHAPTERS CRUD

function showPrevious() {
	if (selectedChapter > 0) {
		selectedChapter--;
		showContent(chapters[selectedChapter]);
	}
}

const showNext = () => {
	selectedChapter = selectedChapter === chapters.length - 1 ? 0 : selectedChapter + 1;
	showContent(chapters[selectedChapter]);
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
		document.getElementById("prevButton").style.display = selectedChapter === 0 ? "none" : "flex";
		document.getElementById("nextButton").style.display =
			selectedChapter === chapters.length - 1 ? "none" : "flex";

		// Update next and previous button texts
		document.getElementById("nextButtonText").textContent =
			selectedChapter === chapters.length - 1
				? chapters[0].title
				: chapters[selectedChapter + 1].title;
		document.getElementById("prevButtonText").textContent = chapters[selectedChapter - 1].title;
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

// Clear modal content when hidden

const deleteConfirmationModal = new bootstrap.Modal(
	document.getElementById("deleteConfirmationModal")
);

// Function to show delete confirmation modal
function showDeleteConfirmation(itemId) {
	deleteConfirmationModal.show();

	// Set up event listener for delete confirmation button
	document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
		deleteBook(itemId);
	});
}

// Function to update book details content
async function updateBookDetails(id) {
	const res = await APIS.fetchBook(id);
	if (res.success) {
		const { author, book_title, description, image } = res.data.book;
		console.log({ res });
		selectedBook = id;
		const bookDetailsContent = document.getElementById("bookDetailsContent");
		bookDetailsContent.innerHTML = "";

		const detailsHeader = document.createElement("div");
		detailsHeader.className = "book_detils_header position-relative d-flex justify-content-start";

		const backButton = document.createElement("button");
		backButton.className = "btn back_button";
		backButton.innerHTML = `
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512">
		  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/>
		</svg>`;
		backButton.addEventListener("click", function () {
			selectedBook = 0;
			showBookList();
		});

		const bookName = document.createElement("h3");
		bookName.className = "book_name_value ";
		bookName.textContent = book_title;

		detailsHeader.appendChild(backButton);
		detailsHeader.appendChild(bookName);

		const addChapterButton = document.createElement("button");
		addChapterButton.className = "btn add_chapter_button";
		addChapterButton.setAttribute("data-bs-toggle", "modal");
		addChapterButton.setAttribute("data-bs-target", "#add-chapter");
		addChapterButton.textContent = "Add a Chapter";
		addChapterButton.addEventListener("click", function () {
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
		showChapterList();
	} else {
		alert("Failed to fetch book");
	}
}

// Function to show book details
function showBookDetails(id) {
	updateBookDetails(id);
	document.getElementById("bookList").style.display = "none";
	document.getElementById("bookDetails").style.display = "block";
}

// Function to show book list
async function showBookList() {
	const res = await APIS.fetchBooks();
	console.log({ res });
	const books = res?.data || [];
	// const books = JSON.parse(sessionStorage.getItem("books") || "[]");
	const list = document.getElementById("book-list");
	list.innerHTML = "";
	for (let book = 0; book < books.length; book++) {
		addBook(books[book]);
	}
	document.getElementById("bookDetails").style.display = "none";
	document.getElementById("bookList").style.display = "block";
}

// Function to add a new chapter
function saveChapter() {
	const name = document.getElementById("chapterTitle").value.trim();

	// Check if the chapterTitle is empty
	if (!name) {
		return;
	}

	const chapter = {
		id: selectedChapter || Math.floor(Math.random() * 1234567890),
		name,
		sections: [],
	};
	debugger;
	let books = JSON.parse(sessionStorage.getItem("books") || "[]");
	books = books.map((book) => {
		if (`${book.id}` === selectedBook) {
			let chapters = book.chapters || [];
			if (
				selectedChapter
					? (chapters = chapters.map((c) => {
							console.log({ c, selectedChapter }, `${c.id}` === selectedChapter);
							if (`${c.id}` === selectedChapter) {
								return { ...c, ...chapter };
							} else return { ...c };
					  }))
					: chapters.push(chapter)
			)
				return {
					...book,
					chapters,
				};
		} else return book;
	});

	sessionStorage.setItem("books", JSON.stringify(books));

	showChapterList();
	selectedChapter = 0;
	document.getElementById("chapterForm").reset();
	addChapterModal.hide();
}
let chapterIdCounter = 0;

async function showChapterList() {
	const res = await APIS.fetchBook(selectedBook);
	console.log({ res });
	let books = JSON.parse(sessionStorage.getItem("books") || "[]");
	const book = books.find((book) => `${book.id}` === selectedBook);
	const chapters = book?.chapters || [];
	// Add the chapter to the list
	const accordion = document.getElementById("accordionExample");
	accordion.innerHTML = "";
	for (let i = 0; i < chapters.length; i++) {
		if (i === 0 && !activeChapter) {
			activeChapter = chapters[i].id;
		}
		addChapterToList(chapters[i], chapters);
	}
	document.getElementById("bookTitle").innerHTML = book.name;
}
function handleChapterClick(id) {
	activeChapter = id;
	showChapterList();
}

function onSectionClick(id) {
	const element = document.getElementById(id);
	element.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
}

function handleSectionClick(id) {
	activeSection = id;
	onSectionClick(id);
	// showChapterList()
}

// Function to add a new chapter to the accordion
function addChapterToList(chapter, chapters) {
	const { name, id, sections } = chapter;
	const accordion = document.getElementById("accordionExample");
	const chapterId = "chapter_" + id;

	console.log({ activeChapter, activeSection });
	if (sections?.length && !activeSection) {
		activeSection = sections[0].id;
	}
	const newItem = `
		<div class="d-flex justify-content-between mb-2 " >
			<button onClick="handleChapterClick('${id}')" class=" grid gap-3 btn-lg accordion-button collapsed add_chapter_accordion" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${chapterId}" aria-expanded="false" aria-controls="collapse${chapterId}">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
					viewBox="0 0 24 24" 
					fill="none" 
					stroke="currentColor" 
					stroke-width="2" 
					stroke-linecap="round" 
					stroke-linejoin="round" 
					class="feather feather-chevron-down mr-3"><polyline points="6 9 12 15 18 9"></polyline></svg>
				${name}
			</button>
			<button class="btn-lg accordion-button w-auto" type="button" id="chapterDropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
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
			<ul class="dropdown-menu" aria-labelledby="chapterDropdownMenuButton">
				<li><a class="dropdown-item" onClick="editChapter('${id}','${name}')" href="#" >Edit</a></li>
				<li><a class="dropdown-item" href="#" onClick="chapterDeleteConfirmation('${id}')"  >Delete</a></li>
			</ul>
		</div>
		<div id="collapse${chapterId}" class='accordion-collapse collapse ${
		`${id}` === `${activeChapter}` ? "show" : ""
	}' aria-labelledby="heading${chapterId}" data-bs-parent="#accordionExample">
			<div class="accordion-body d-grid gap-2">
				<button
					id="prevButton"
					type="button"
					class="btn btn-dark accordion-button"
					onclick="addSection('${activeChapter}')"
				>
					Add a section
				</button>
				${
					sections.length
						? sections.map((section) => renderSection(section, id, name)).join("")
						: "No Content"
				}
			</div>
		</div>
	
	`;
	accordion.insertAdjacentHTML("beforeend", newItem);
	const chap = chapters.find((i) => `${i.id}` === `${activeChapter}`);
	listSections(chap?.sections || []);
}

function renderSection(section, id, name) {
	return `
	<div class="d-flex" >
		<button class="btn-lg btn active rounded-0 rounded-start d-flex gap-3 w-100 border-end-0 text-left justify-content-between align-items-center" onClick="onSectionClick('${id}')" >
			${section.name}
		</button>	
		<div class="dropdown h-100"  >
			<button class=" h-100 btn-lg btn active d-flex gap-3 rounded-0 rounded-end  border-start-0  text-left justify-content-between align-items-center dropdown-toggle" type="button" id="sectionDopdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false"  >
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
			<ul class="dropdown-menu" aria-labelledby="sectionDopdownMenuButton">
				<li><a class="dropdown-item" onClick="editSection('${id}','${section.id}')" href="#" >Edit</a></li>
				<li><a class="dropdown-item" href="#" onClick="sectionDeleteConfirmation('${id}', '${section.id}')"  >Delete</a></li>
			</ul>
		</div>
</div>`;
}
// SECTION CRUD

function listSections(sections = []) {
	const content = document.getElementById("content");
	console.log({ sections });
	let str = "";
	if (sections.length) {
		str = sections
			.map((section) => {
				const sectionId = `${section.id}`;
				return `<div class="content-section" >
			<div id="${sectionId}" ><strong>${section.content}</strong></div>
		</div>`;
			})
			.join(`<br/><br/>`);
	} else {
		str = `No content`;
	}
	content.innerHTML = str;
}

function handleSubmit() {
	const sectionDetails = {
		id: selectedSection || Math.floor(Math.random() * 1234567890),
		name: document.getElementById("section-name").value,
		content: document.getElementById("section-content").value,
	};

	let books = JSON.parse(sessionStorage.getItem("books") || "[]");
	books = updateBooks(books, sectionDetails);
	sessionStorage.setItem("books", JSON.stringify(books));
}

function updateBooks(books, sectionDetails) {
	return books.map((book) => {
		if (`${book.id}` === selectedBook) {
			return {
				...book,
				chapters: updateChapters(book.chapters, sectionDetails),
			};
		}
		return book;
	});
}

function updateChapters(chapters, sectionDetails) {
	return chapters.map((chapter) => {
		if (`${chapter.id}` !== `${chapterId}`) {
			return {
				...chapter,
				sections: updateSections(chapter.sections, sectionDetails),
			};
		}
		return chapter;
	});
}

function updateSections(sections, sectionDetails) {
	return sections.map((section) => {
		if (`${section.id}` === `${sectionId}`) {
			return { ...section, ...sectionDetails };
		}
		return section;
	});
}

function addSection() {
	selectedSection = 0;
	activeSection = 0;
	addSectionModal.show();
	document.getElementById("sectionForm").reset();
}
function saveSection() {
	const name = document.getElementById("sectionTitle").value.trim();
	const content = document.getElementById("sectionContent").value.trim();

	// Check if the chapterTitle is empty
	if (!name) {
		return;
	}

	const section = {
		id: selectedSection || Math.floor(Math.random() * 1234567890),
		name,
		content,
	};
	let books = JSON.parse(sessionStorage.getItem("books") || "[]");
	books = books.map((book) => {
		if (`${book.id}` === selectedBook) {
			return {
				...book,
				chapters: book.chapters.map((c) => {
					if (`${c.id}` === `${activeChapter}`) {
						debugger;
						let sections = c.sections || [];
						if (selectedSection) {
							sections = sections.map((s) => {
								console.log(
									{ section, activeSection },
									`${s.id}` === `${activeSection || selectedSection}`
								);
								if (`${s.id}` === `${activeSection || selectedSection}`) {
									return {
										...s,
										...section,
									};
								}
								return s;
							});
						} else {
							sections.push(section);
						}
						return { ...c, sections };
					} else return c;
				}),
			};
		} else return book;
	});
	console.log({ books });

	sessionStorage.setItem("books", JSON.stringify(books));

	showChapterList();
	selectedSection = 0;
	document.getElementById("sectionForm").reset();
	addSectionModal.hide();
}

// Function to edit a chapter
function editChapter(id, name) {
	selectedChapter = id;
	document.getElementById("chapterTitle").value = name;
	addChapterModal.show();
}
function editSection(id, sectionId) {
	selectedSection = sectionId;
	activeSection = sectionId;
	let section = {};
	const books = JSON.parse(sessionStorage.getItem("books" || "[]"));
	const book = books.find((book) => `${book.id}` === `${selectedBook}`);
	const chapter = book.chapters.find((chap) => `${chap.id}` === `${id}`);
	section = chapter.sections.find((sec) => `${sec.id}` === `${sectionId}`);
	console.log({ selectedSection, activeSection, section });
	document.getElementById("sectionTitle").value = section.name;
	document.getElementById("sectionContent").value = section.content;
	addSectionModal.show();
}

// Function to delete a chapter
function deleteChapter(id) {
	console.log({ id });
	let books = JSON.parse(sessionStorage.getItem("books") || "[]");
	books = books.map((book) => {
		if (`${book.id}` === selectedBook) {
			return {
				...book,
				chapters: book.chapters.filter((chapter) => `${chapter.id}` !== `${id}`),
			};
		}
		return book;
	});
	console.log({ books });
	sessionStorage.setItem("books", JSON.stringify(books));
	showChapterList();
	deleteConfirmationModal.hide();
}
function deleteSection(id, sec) {
	console.log({ id, sec });
	let books = JSON.parse(sessionStorage.getItem("books") || "[]");
	books = books.map((book) => {
		if (`${book.id}` === selectedBook) {
			return {
				...book,
				chapters: book.chapters.map((chapter) => {
					if (`${chapter.id}` === `${id}`) {
						return { ...chapter, sections: chapter.sections.filter((s) => `${s.id}` !== `${sec}`) };
					}
					return chapter;
				}),
			};
		}
		return book;
	});
	console.log({ books });
	sessionStorage.setItem("books", JSON.stringify(books));
	showChapterList();
	selectedSection = 0;
	activeSection = 0;
	document.getElementById("chapterForm").reset();
	deleteConfirmationModal.hide();
}
// Function to show delete confirmation modal for chapters
function chapterDeleteConfirmation(id) {
	deleteConfirmationModal.show();

	// Set up event listener for delete confirmation button
	document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
		deleteChapter(id);
	});
	document.getElementById("cancelConfirmationModal").addEventListener("click", function () {
		selectedChapter = 0;
		document.getElementById("chapterForm").reset();
	});
	document.getElementById("cancelConfirmationButton").addEventListener("click", function () {
		selectedChapter = 0;
		document.getElementById("chapterForm").reset();
	});
}
function sectionDeleteConfirmation(id, sec) {
	deleteConfirmationModal.show();

	// Set up event listener for delete confirmation button
	document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
		deleteSection(id, sec);
	});
	document.getElementById("cancelConfirmationModal").addEventListener("click", function () {
		selectedSection = 0;
		document.getElementById("sectionForm").reset();
	});
	document.getElementById("cancelConfirmationButton").addEventListener("click", function () {
		selectedSection = 0;
		document.getElementById("sectionForm").reset();
	});
}

let Inline = Quill.import("blots/inline");

class Citation extends Inline {
	static create(citationId) {
		let node = super.create();
		node.setAttribute("class", "citation");
		node.dataset.citationId = citationId;
		return node;
	}

	static formats(node) {
		return node.dataset.citationId;
	}
}
Citation.blotName = "citation";
Citation.tagName = "span";

Quill.register(Citation);

function addCitation() {
	let citationText = prompt("Enter the citation:");
	if (citationText) {
		let range = quill.getSelection();
		if (range && range.length > 0) {
			let citationId = "citation-" + Date.now();
			quill.formatText(range.index, range.length, "citation", citationId);

			// Update the citation list
			updateCitationList(citationId, citationText);
		} else {
			alert("Please select text to add a citation.");
		}
	}
}

function updateCitationList(citationId, citationText) {
	let citationsDiv = document.getElementById("citations-container");
	let citationElement = document.createElement("div");
	citationElement.textContent = citationText;
	citationElement.id = citationId;
	citationElement.classList.add("citation-item");
	citationElement.onclick = () => scrollToCitation(citationId);
	citationsDiv.appendChild(citationElement);
}

function scrollToCitation(citationId) {
	let citationElement = document.getElementById(citationId);
	if (citationElement) {
		citationElement.scrollIntoView({ behavior: "smooth" });
	}
}

document.getElementById("editor").addEventListener("click", function (e) {
	if (e.target.classList.contains("citation")) {
		let citationId = e.target.dataset.citationId;
		scrollToCitation(citationId);
	}
});

document.querySelector(".ql-citation").addEventListener("click", addCitation);

let contentDisplayDiv = document.getElementById("content-display");

quill.on("text-change", function (delta, oldDelta, source) {
	if (delta.ops.length === 2 && delta.ops[1].insert === "\n") {
		// Display editor's content in the contentDisplayDiv
		contentDisplayDiv.innerHTML = quill.root.innerHTML;
	}
});

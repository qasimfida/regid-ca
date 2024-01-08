// GLOBAL VARIABLES
let selectedBook = 0;
let selectedChapter = 0;
let selectedSection = 0;
let activeSection = 0;
let activeChapter = 0;
let itemIdCounter = 0;
const base_url = "http://localhost:8080/books";
const rightbar = document.getElementById("rightbar");

const toolbarOptions = [
	["bold", "italic", "underline", "strike"],
	["blockquote", "code-block"],

	[{ list: "ordered" }, { list: "bullet" }],
	[{ script: "sub" }, { script: "super" }],
	[{ indent: "-1" }, { indent: "+1" }],
	[{ direction: "rtl" }],
	[{ header: ["1", "2", "3", false, "customHeader"] }],

	[{ color: [] }, { background: [] }],
	[{ font: [] }],
	[{ align: [] }],

	["clean"],
	["link", "image", "citation"],
];

const notifications = document.querySelector(".notifications");

const removeToast = (toast) => {
	toast.classList.add("hide");
	if (toast.timeoutId) clearTimeout(toast.timeoutId);
	setTimeout(() => toast.remove(), 500);
};

const createToast = (error) => {
	const { message, type, status } = error;
	const toast = document.createElement("li");
	toast.className = `toast ${type}`;
	toast.innerHTML = `<div class="column">
                         <span><b>${status}</b></span>
                         <span>${message}</span>
                      </div>
					  <button
						type="button"
						class="btn-close"
						aria-label="Close" onclick="removeToast(this.parentElement)" >
					  </button>`;
	notifications.appendChild(toast);
	toast.timeoutId = setTimeout(() => removeToast(toast), 5000);
};

class CitationTooltip extends Quill.import("ui/tooltip") {
	constructor(quill, boundsContainer) {
		super(quill, boundsContainer);

		// Set a class for styling the tooltip
		this.root.classList.add("ql-citation-tooltip");

		// Add HTML structure for the tooltip
		const tooltipInnerHtml = `
				<input class="citation-input" type="text" placeholder="Enter citation">
				<button class="save-btn">Save</button>
				<button class="cancel-btn">Cancel</button>
			`;
		this.root.innerHTML = tooltipInnerHtml;

		// Save references to elements
		this.textbox = this.root.querySelector(".citation-input");
		this.saveBtn = this.root.querySelector(".save-btn");
		this.cancelBtn = this.root.querySelector(".cancel-btn");

		// Bind event listeners
		this.saveBtn.addEventListener("click", (e) => this.save(e));
		this.cancelBtn.addEventListener("click", (e) => this.hide());
	}

	show(value = "", bounds) {
		// Position and initialize the tooltip
		this.textbox.value = value;
		super.show(); // Use the built-in show method for positioning
		console.log({ bounds, root: this.root });
		// Custom positioning logic if necessary
		if (bounds) {
			// this.root.style.display = `block`;
			this.root.style.left = `${bounds.left}px`;
			this.root.style.top = `${60}px`; // Example positioning
		}

		this.textbox.select();
	}

	hide() {
		super.hide();
	}

	save(e) {
		e.preventDefault();
		// Logic to save the citation
		const value = this.textbox.value;
		console.log("Saving citation:", value);
		// Implement saving logic here
		this.hide();
	}
}
Quill.register("modules/citationTooltip", CitationTooltip);

const citationHanlder = (value) => {
	let range = quill.getSelection();
	if (range && range.length > 0) {
		console.log({ value });
		// Logic to show the custom citation tooltip
		// Determine the bounds for positioning
		const bounds = this.quill.getBounds(this.quill.getSelection());
		const citationTooltip = this.quill.getModule("citationTooltip");
		citationTooltip.show("", bounds);
	} else {
		// Hide the tooltip or perform other actions when the button is toggled off
	}
};
let quill = new Quill("#editor", {
	theme: "snow",
	modules: {
		toolbar: {
			handlers: {
				image: imageHandler,
				citation: citationHanlder,
			},
			container: toolbarOptions,
		},
		citationTooltip: true,
	},
});

quill.root.addEventListener("click", function (event) {
	if (event.target.tagName === "SPAN" && event.target.classList.contains("ql-citation")) {
		// Get citation data
		const citationValue = event.target.getAttribute("data-citation");

		// Calculate bounds for positioning the tooltip
		const bounds = event.target.getBoundingClientRect();

		// Show the citation tooltip for editing
		const citationTooltip = quill.getModule("citationTooltip");
		citationTooltip.show(citationValue, bounds);
	}
});
const toolbar = quill.getModule("toolbar");
if (toolbar) {
	const citationButton = toolbar.container.querySelector(".ql-citation");
	if (citationButton) {
		citationButton.textContent = "Cite";
	}
}

async function imageHandler() {
	const range = this.quill.getSelection();
	const input = document.createElement("input");
	input.setAttribute("type", "file");
	input.setAttribute("accept", "image/*");
	input.click();

	input.onchange = () => {
		const file = input.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const imgSrc = e.target.result;
				const figureLabel = prompt("Enter a figure label:");
				const figureId = "figure-" + Date.now(); // Generate a unique ID

				if (figureLabel) {
					try {
						const res = await APIS.addFigure({
							figure_id: figureId,
							figure_name: figureLabel,
							book_id: selectedBook,
							figure_image: imgSrc,
						});
						if (res.success) {
							this.quill.insertEmbed(range.index, "figure", {
								id: figureId,
								src: imgSrc,
								caption: figureLabel,
							});
							createToast({
								type: "success",
								status: "Successful",
								message: "Figure added successfully",
							});
						} else {
							createToast({ type: "error", status: "Failed!", message: res.error });
						}
					} catch (err) {
						createToast({ type: "error", status: "Error!", message: "Something went wrong" });
					}
				} else {
					// Optionally alert the user
					createToast({
						type: "error",
						message: "You must enter a figure label to insert an image.",
						status: "Failed",
					});
				}
			};
			reader.readAsDataURL(file);
		}
	};
}

async function makeRequest(url, method = "GET", body = null, isFormData) {
	const options = { method };
	if (body) {
		if (isFormData) {
			options.body = body;
		} else {
			options.body = JSON.stringify(body);
		}
	}

	try {
		const response = await fetch(`${base_url}${url}`, options);
		if (!response?.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (err) {
		console.log("HTTP request failed:", err?.data);
		throw err;
	}
}

const APIS = {
	fetchBooks: () => makeRequest(`/books`),
	fetchBook: (id) => makeRequest(`/books/${id}`),
	addNewBook: (payload) => makeRequest("/books", "POST", payload, true),
	addChapter: (id, payload) => makeRequest(`/chapter/${id}`, "POST", payload),
	updateBook: (id, payload) => makeRequest(`/books/${id}`, "PUT", payload, true),
	deleteBook: (id) => makeRequest(`/book/${id}`, "DELETE"),
	fetchChapters: (id) => makeRequest(`/chapter/${id}`),
	updateChapter: (id, payload) => makeRequest(`/chapter/${id}`, "PUT", payload),
	addCitation: (payload) => makeRequest(`/citation/${payload.book_id}`, "POST", payload),
	getCitations: (id) => makeRequest(`/citation/${id}`),
	addFigure: (payload) => makeRequest(`/figure/${payload.book_id}`, "POST", payload),
	getFigures: (id) => makeRequest(`/figures/${id}`),
	addSection: (book_id, chapter_id, payload) =>
		makeRequest(`/book/${book_id}/chapter/${chapter_id}`, "POST", payload),
	getChapter: (book_id, chapter_id) => makeRequest(`/sections/${book_id}`),
	getSection: (id) => makeRequest(`/section/${id}`),
	updateSection: (id, payload) => makeRequest(`/section/${id}`, "PUT", payload),
	deleteSection: (id) => makeRequest(`/section/${id}`, "DELETE"),
	deleteChapter: (id) => makeRequest(`/chapter/${id}`, "DELETE"),
};

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

async function updateBook(formData){
	try {
		let res;
		if (selectedBook) {
			res = await APIS.updateBook(selectedBook, formData);
		} else {
			res = await APIS.addNewBook(formData);
		}
		if (res.success) {
			createToast({
				type: "success",
				status: "Successful",
				message: `Book ${!selectedBook ? "added" : "updated"} successfully`,
			});
			showBookList();
			document.getElementById("modalForm").reset();
			document.getElementById("image").value = "";
			selectedBook = 0;
			modal.hide();
		} else {
			createToast({ type: "error", status: "Error", message: res.error });
		}
	} catch (err) {
		console.log("Error saving book:", { err });
		createToast({
			type: "error",
			status: "Error",
			message: `Something went wrong`,
		});
	}
}

// Function to add or update an item in the list
async function saveBook() {
	const book_title = document.getElementById("itemName").value;
	const description = document.getElementById("itemDescription").value;
	const author = document.getElementById("creditby").value;
	const imageInput = document.getElementById("image");
	const formData = new FormData();
	formData.append("book_title", book_title);
	formData.append("description", description);
	formData.append("author", author);

	function convertImageToBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => resolve(event.target.result);
			reader.onerror = (error) => reject(error);
			reader.readAsDataURL(file);
		});
	}

	if (imageInput?.files?.[0]) {
		convertImageToBase64(imageInput.files[0])
			.then(async (base64String) => {
				formData.append("image", base64String);

				await updateBook(formData)
			})
			.catch((error) => {
				console.error("Error in file reading:", error);
			});
	} else {
		await updateBook(formData)
	}
	
}

// Function to add a Book to the list
function addBook(book) {
	const { id } = book;
	const itemList = document.getElementById("book-list");
	const li = document.createElement("li");
	li.id = id;
	li.className = "list-group-item d-flex justify-content-between align-items-center";
	li.innerHTML = renderAddBook(book);
	itemList.appendChild(li);
}

// Function to edit an existing item
async function editBook(id) {
	const res = await APIS.fetchBook(id);
	if (res.success) {
		const { author, book_title, description, image } = res.data.book;
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

// Function to delete a book from the list
async function deleteBook(bookId) {
	try {
		const res = await APIS.deleteBook(bookId);
		if (res.success) {
			deleteConfirmationModal.hide();
			showBookList();
		}
		console.log({ res }, "DELETE");
	} catch (err) {
		console.log({ err }, "DELETE Err");
	}
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
	console.log({ res }, "Asdf");
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
		updateCitationList();
		updateFigureList();
	} else {
		alert("Failed to fetch book");
	}
}

rightbar.style.display = "none";
// Function to show book details
function showBookDetails(id) {
	updateBookDetails(id);
	rightbar.style.display = "block";
	document.getElementById("bookList").style.display = "none";
	document.getElementById("bookDetails").style.display = "block";
}

// Function to show book list
async function showBookList() {
	const res = await APIS.fetchBooks();
	if (selectedBook) {
		rightbar.style.display = "block";
	} else {
		rightbar.style.display = "none";
	}
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
async function saveChapter() {
	const chapter_name = document.getElementById("chapterTitle").value.trim();

	// Check if the chapterTitle is empty
	if (!chapter_name) {
		return;
	}

	const chapter = {
		chapter_name,
	};
	try {
		debugger;
		let res;
		if (selectedChapter) {
			res = await APIS.updateChapter(selectedChapter, chapter);
		} else {
			res = await APIS.addChapter(selectedBook, chapter);
		}
		if (res.success) {
			createToast({
				type: "success",
				status: "Successful",
				message: `${chapter_name} ${!selectedChapter ? "added" : "updated"}  successfully `,
			});
			showChapterList();
			selectedChapter = 0;
			document.getElementById("chapterForm").reset();
			addChapterModal.hide();
		} else {
			createToast({ type: "error", status: "Failed", message: res.error });
		}
	} catch (err) {
		console.log({ err });
		debugger;

		createToast({ type: "error", status: "Failed", message: "Something went wrong" });
	}
}
let chapterIdCounter = 0;

async function showChapterList() {
	const res = await APIS.fetchBook(selectedBook);
	if (res.success) {
		const book = res.data.book;
		const chapters = res.data?.chapters || [];
		const accordion = document.getElementById("accordionExample");
		accordion.innerHTML = "";
		for (let i = 0; i < chapters.length; i++) {
			if (i === 0 && !activeChapter) {
				activeChapter = chapters[i].id;
			}
			addChapterToList(chapters[i], chapters);
		}
		document.getElementById("bookTitle").innerHTML = book.book_title;
	} else {
		console.log({ res }, "Error fetching ");
	}

	// Add the chapter to the list
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

console.log({ activeChapter, selectedChapter });
// Function to add a new chapter to the accordion
function addChapterToList(chapter, chapters) {
	const { chapter_name, id, sections } = chapter;
	const accordion = document.getElementById("accordionExample");
	const chapterId = "chapter_" + id;

	console.log({ activeChapter, activeSection, sections });
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
					class="feather feather-chevron-down mr-3 ${
						`${id}` === `${activeChapter}` ? "rotateXFull" : ""
					} "><polyline points="6 9 12 15 18 9"></polyline></svg>
				${chapter_name}
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
				<li><a class="dropdown-item" onClick="editChapter('${id}','${chapter_name}')" href="#" >Edit</a></li>
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
						? sections.map((section) => renderSection(section, id, chapter_name)).join("")
						: "No Content"
				}
			</div>
		</div>
	
	`;
	accordion.insertAdjacentHTML("beforeend", newItem);
	if (`${id}` === `${activeChapter}`) {
		listSections(sections || []);
	}
}

function renderSection(section, id, name) {
	console.log({ section });
	return `
	<div class="d-flex" >
		<button class="btn-lg btn active rounded-0 rounded-start d-flex gap-3 w-100 border-end-0 text-left justify-content-between align-items-center" onClick="onSectionClick('${id}')" >
			${section.section_title}
		</button>	
		<div class="dropdown h-100"  >
			<button class=" h-100 btn-lg btn active d-flex gap-3 rounded-0 rounded-end  border-start-0  text-left justify-content-between align-items-center dropdown-toggle" type="button" id="${
				"section_id" + section.id
			}" data-bs-toggle="dropdown" aria-expanded="false"  >
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
			<ul class="dropdown-menu" aria-labelledby="${"section_id" + section.id}">
				<li><a class="dropdown-item" onClick="editSection('${id}','${section.id}')" href="#" >Edit</a></li>
				<li><a class="dropdown-item" href="#" onClick="sectionDeleteConfirmation('${id}', '${
		section.id
	}')"  >Delete</a></li>
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
async function saveSection() {
	const section_title = document.getElementById("sectionTitle").value.trim();
	const content = quill.root.innerHTML;

	// Check if the chapterTitle is empty
	if (!section_title) {
		return;
	}
	console.log({ content });
	const section = {
		section_title,
		content,
	};
	debugger;
	let res;
	try {
		if (activeSection) {
			res = await APIS.addSection(selectedBook, selectedChapter || activeChapter, section);
		} else {
			res = await APIS.updateSection(activeSection, section);
		}
	} catch (err) {
		createToast({ type: "error", status: "Failed!", message: "Something went wrong" });
	}
	if (res.success) {
		showChapterList();
		selectedSection = 0;
		document.getElementById("sectionForm").reset();
		addSectionModal.hide();
		createToast({
			type: "success",
			status: "Successful",
			message: "Citation added successfully",
		});
	} else {
		createToast({ type: "error", status: "Failed!", message: res.error });
	}
}

// Function to edit a chapter
function editChapter(id, name) {
	selectedChapter = id;
	document.getElementById("chapterTitle").value = name;
	addChapterModal.show();
}
async function editSection(id, sectionId) {
	selectedSection = sectionId;
	activeSection = sectionId;
	let section = {};
	try {
		const res = await APIS.getSection(sectionId);
		console.log({ res }, "section");
		if (res.success) {
			const section = res.data?.[0] || {};
			// section = sections.find((sec) => `${sec.id}` === `${activeSection}`);
			// const books = JSON.parse(sessionStorage.getItem("books" || "[]"));
			// const book = books.find((book) => `${book.id}` === `${selectedBook}`);
			// const chapter = book.chapters.find((chap) => `${chap.id}` === `${id}`);
			// console.log({ selectedSection, activeSection, section });
			addSectionModal.show();
			document.getElementById("sectionTitle").value = section.section_title;
			quill.clipboard.dangerouslyPasteHTML(section.content);
			// document.getElementById("sectionContent").value = section.content;
		}
	} catch (err) {}
}

// Function to delete a chapter
async function deleteChapter(id) {
	console.log({ id });
	try {
		const res = await APIS.deleteChapter(id);
		if (res.success) {
			createToast({
				type: "success",
				status: "Successful",
				message: `Chapter deleted successfully`,
			});
			showChapterList();
	deleteConfirmationModal.hide()
		} else {
			createToast({ type: "error", status: "Error", message: res.error });
		}
	} catch (err) {
		console.log("Error deleting Chapter:", { err });
		createToast({
			type: "error",
			status: "Error",
			message: `Something went wrong`,
		});
	}
	showChapterList();
	deleteConfirmationModal.hide();
}
async function deleteSection(id, sec) {
	try {
		const res = await APIS.deleteSection(id);
		if (res.success) {
			createToast({
				type: "success",
				status: "Successful",
				message: `${book_title} ${!selectedBook ? "added" : "updated"} successfully`,
			});
			console.log({ books });
			sessionStorage.setItem("books", JSON.stringify(books));
			showChapterList();
			selectedSection = 0;
			activeSection = 0;
			document.getElementById("chapterForm").reset();
			deleteConfirmationModal.hide();
		} else {
			createToast({ type: "error", status: "Error", message: res.error });
		}
	} catch (err) {
		console.log("Error saving book:", { err });
		createToast({
			type: "error",
			status: "Error",
			message: `Something went wrong`,
		});
	}
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
		node.setAttribute("id", citationId);
		return node;
	}

	static formats(node) {
		return node.getAttribute("id");
	}
}
Citation.blotName = "citation";
Citation.tagName = "span";

Quill.register(Citation);

let BlockEmbed = Quill.import("blots/block/embed");

class FigureBlot extends BlockEmbed {
	static create(value) {
		let node = super.create();
		node.setAttribute("id", value.id);

		const img = document.createElement("img");
		img.setAttribute("src", value.src);
		node.appendChild(img);

		const caption = document.createElement("figcaption");
		caption.textContent = value.caption;
		node.appendChild(caption);

		return node;
	}

	static value(node) {
		return {
			id: node.getAttribute("id"),
			src: node.firstChild.getAttribute("src"),
			caption: node.lastChild.textContent,
		};
	}
}

FigureBlot.blotName = "figure";
FigureBlot.tagName = "figure";
Quill.register(FigureBlot);

async function addCitation() {
	let citationText = prompt("Enter the citation:");
	if (citationText) {
		let range = quill.getSelection();
		if (range && range.length > 0) {
			let citationId = "citation-" + Date.now();
			quill.format("citation", citationText, Quill.sources.USER);
			quill.formatText(range.index, range.length, { citation: citationId });
			try {
				quill.formatText(range.index, range.length, { citation: citationId });
				// const res = await APIS.addCitation({
				// 	citation_id: citationId,
				// 	citation_name: citationText,
				// 	book_id: selectedBook,
				// });
				// if (res.success) {
				// 	quill.formatText(range.index, range.length, { citation: citationId });
				// 	createToast({
				// 		type: "success",
				// 		status: "Successful",
				// 		message: "Citation added successfully",
				// 	});
				// 	updateCitationList(citationId, citationText);
				// } else {
				// 	createToast({ type: "error", status: "Failed!", message: res.error });
				// }
			} catch (err) {
				createToast({ type: "error", status: "Error!", message: "Something went wrong" });
			}
			// Update the citation list
		} else {
			alert("Please select text to add a citation.");
		}
	}
}

async function updateCitationList() {
	let citationsDiv = document.getElementById("citations-container");
	try {
		const res = await APIS.getCitations(selectedBook);
		if (res.success) {
			const citations = res.data || [];
			for (let i = 0; i < citations.length; i++) {
				let citationElement = document.createElement("li");
				citationElement.innerHTML = `<li>
						<a href="#${citations[i].citation_id}">${citations[i].citation_name}</a
						>
					</li>`;
				citationsDiv.appendChild(citationElement);
			}
			console.log({ res });
		} else {
			createToast({ type: "error", status: "Failed!", message: res.error });
		}
	} catch (err) {
		createToast({ type: "error", status: "Error!", message: "Something went wrong" });
	}
}
async function updateFigureList() {
	let citationsDiv = document.getElementById("figures-container");
	try {
		const res = await APIS.getFigures(selectedBook);
		if (res.success) {
			const figures = res.data || [];
			for (let i = 0; i < figures.length; i++) {
				let figureElement = document.createElement("li");
				figureElement.innerHTML = `
						<li>
							<a href="#${figures[i].figure_id}">
								<i>
									<svg width="20" height="20" viewBox="0 0 1920 1536">
										<path
											fill="currentColor"
											d="M640 448q0 80-56 136t-136 56t-136-56t-56-136t56-136t136-56t136 56t56 136zm1024 384v448H256v-192l320-320l160 160l512-512zm96-704H160q-13 0-22.5 9.5T128 160v1216q0 13 9.5 22.5t22.5 9.5h1600q13 0 22.5-9.5t9.5-22.5V160q0-13-9.5-22.5T1760 128zm160 32v1216q0 66-47 113t-113 47H160q-66 0-113-47T0 1376V160Q0 94 47 47T160 0h1600q66 0 113 47t47 113z" />
									</svg>
								</i>
								${figures[i].figure_name}
							</a>
						</li>
					`;
				citationsDiv.appendChild(figureElement);
			}
		} else {
			createToast({ type: "error", status: "Failed!", message: res.error });
		}
	} catch (err) {
		createToast({ type: "error", status: "Error!", message: "Something went wrong" });
	}
}

let contentDisplayDiv = document.getElementById("content-display");

quill.on("text-change", function (delta, oldDelta, source) {
	if (delta.ops.length === 2 && delta.ops[1].insert === "\n") {
		// Display editor's content in the contentDisplayDiv
		contentDisplayDiv.innerHTML = quill.root.innerHTML;
	}
});

const renderAddBook = ({ id, image, book_title }) => `
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
					<li><a class="dropdown-item" href="#" onclick="editBook('${id}')">Edit</a></li>
					<li><a class="dropdown-item" href="#" onclick="showDeleteConfirmation('${id}')">Delete</a></li>
				</ul>
			</div>
		</span>
	`;

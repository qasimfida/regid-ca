// GLOBAL VARIABLES
let selectedBook = 0;
let selectedChapter = 0;
let selectedSection = 0;
let activeSection = 0;
let activeChapter = 0;
let itemIdCounter = 0;

const Inline = Quill.import("blots/inline");
const BlockEmbed = Quill.import("blots/block/embed");
const rightbar = document.getElementById("rightbar");

// const base_url = "https://regid.ca/AW-Dev3/books/public/";
const base_url = "http://localhost:8080/boiler";
const APIS = {
	fetchBooks: () => makeRequest(`/books`),
	fetchBook: (id) => makeRequest(`/books/${id}`),
	addNewBook: (payload) => makeRequest("/books", "POST", payload, true),
	addChapter: (id, payload) => makeRequest(`/chapter/${id}`, "POST", payload),
	updateBook: (id, payload) => makeRequest(`/books/${id}`, "PUT", payload, false),
	deleteBook: (id) => makeRequest(`/book/${id}`, "DELETE"),
	fetchChapters: (id) => makeRequest(`/chapter/${id}`),
	updateChapter: (id, payload) => makeRequest(`/chapter/${id}`, "PUT", payload),
	addCitation: (payload) => makeRequest(`/citation/${payload.book_id}`, "POST", payload),
	getCitations: (id) => makeRequest(`/citations/${id}`),
	addFigure: (book_id, formData) => makeRequest(`/figure/${book_id}`, "POST", formData, true),
	getFigures: (id) => makeRequest(`/figures/${id}`),
	addSection: (book_id, chapter_id, payload) =>
		makeRequest(`/book/${book_id}/chapter/${chapter_id}`, "POST", payload),
	getChapter: (book_id, chapter_id) => makeRequest(`/sections/${book_id}`),
	getSection: (id) => makeRequest(`/section/${id}`),
	updateSection: (id, payload) => makeRequest(`/section/${id}`, "PUT", payload),
	deleteSection: (id) => makeRequest(`/section/${id}`, "DELETE"),
	deleteChapter: (id) => makeRequest(`/chapter/${id}`, "DELETE"),
	getCitation: (id) => makeRequest(`/citation/${id}`),
	getFigure: (id) => makeRequest(`/figure/${id}`),
	updateFigure: (payload) => makeRequest(`/figure/${payload.figure_id}`, "PUT", payload),
	deleteFigure: (id) => makeRequest(`/figure/${id}`, "DELETE"),
	deleteCitation: (id) => makeRequest(`/citation/${id}`, "DELETE"),
};

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
const sectionForm = document.getElementById("sectionForm");
const modal = new bootstrap.Modal(document.getElementById("addBookModal"));
const addChapterModal = new bootstrap.Modal(document.getElementById("addChapterModal"));
const addSectionModal = new bootstrap.Modal(document.getElementById("addSectionModal"));
const deleteConfirmationModal = new bootstrap.Modal(
	document.getElementById("deleteConfirmationModal")
);

/* const deleteConfirmationModal = new bootstrap.Modal(
	document.getElementById("deleteConfirmationModal")
);
const deleteConfirmationModal = new bootstrap.Modal(
	document.getElementById("deleteConfirmationModal")
);
const deleteConfirmationModal = new bootstrap.Modal(
	document.getElementById("deleteConfirmationModal")
); */

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

const generateId = (key) => {
	const date = new Date().getTime();
	return `${key || "id"}-${date}-${Math.floor(Math.random() * 100000)}`;
};
class CitationBlot extends Inline {
	static create(id) {
		let node = super.create();
		node.setAttribute("class", "citation-link");
		node.setAttribute("id", id);
		node.setAttribute("data-citation", id);
		console.log({ id, node }, "node");
		return node;
	}

	static formats(node) {
		return node.getAttribute("data-citation");
	}
}

CitationBlot.blotName = "citation";
CitationBlot.tagName = "span";

class FigureBlot extends BlockEmbed {
	static create(value) {
		let node = super.create();
		node.setAttribute("id", value.id);

		const img = document.createElement("img");
		img.setAttribute("src", value.src);
		node.appendChild(img);

		const caption = document.createElement("figcaption");
		caption.textContent = value.caption;
		caption.setAttribute("data-figure", value.id);
		caption.setAttribute("class", "figure-caption");
		node.appendChild(caption);

		return node;
	}

	static value(node) {
		console.log({ node, first: node.firstChild, last: node.lastChild });
		return {
			id: node.getAttribute("id"),
			src: node.firstChild ? node.firstChild.getAttribute("src") : "",
			caption: node.lastChild ? node.lastChild.textContent : "",
		};
	}
}

FigureBlot.blotName = "figure";
FigureBlot.tagName = "figure";

class FigureTooltip extends Quill.import("ui/tooltip") {
	constructor(quill, boundsContainer) {
		super(quill, boundsContainer);
		this.root.classList.add("ql-figure-tooltip");
		this.setupTooltip();
		this.bindEventListeners();
	}

	setupTooltip() {
		this.root.innerHTML = `
            <input class="figure-input" type="text" placeholder="Enter Figure">
            <button class="save-btn" type="button">Save</button>
            <button class="cancel-btn" type="button">Cancel</button>
        `;
	}

	bindEventListeners() {
		this.textbox = this.root.querySelector(".figure-input");
		this.saveBtn = this.root.querySelector(".save-btn");
		this.cancelBtn = this.root.querySelector(".cancel-btn");

		this.saveBtn.addEventListener("click", this.save.bind(this));
		this.cancelBtn.addEventListener("click", this.hide.bind(this));
	}

	async show(figure, bounds) {
		console.log({ figure });

		this.figure = figure || {};
		if (figure.figure_id) {
			this.root.querySelector(".save-btn").textContent = "Update";
		}
		this.textbox.value = figure.figure_name || "";
		super.show();
		this.positionTooltip(bounds);
	}

	positionTooltip(bounds) {
		if (bounds) {
			this.root.style.left = `${bounds.left + window.pageXOffset}px`;
			this.root.style.top = `${bounds.top}px`;
		}
	}

	async save(e) {
		e.preventDefault();
		const value = this.textbox.value;

		if (!value) {
			return this.showEmptyValueError();
		}
		const figure = this.figure;
		try {
			let figure_id = figure.figure_id || generateId("figure");
			const formData = new FormData();
			formData.append("book_id", selectedBook);
			formData.append("figure_image", figure?.figure_image);
			formData.append("figure_id", figure_id);
			formData.append("figure_name", value);
			formData.append("chapter_id", selectedChapter || activeChapter);
			formData.append("section_id", selectedSection || activeChapter );
				
			if(selectedSection === 0 ||  selectedSection === undefined ){
				createToast({
					type: "error",
					status: "Failed",
					message: `Unable to Create Figure! Please Save Section`,
				});	
				return;
			}
			let res = await APIS.addFigure(selectedBook, formData);

			if (res.success) {
				this.updateQuillEditor(figure_id, res.data.figure_image);
				updateFigureList();
				this.showSuccessToast();
				this.hide();
			} else {
				this.showFailureToast(res.error);
			}
		} catch (err) {
			console.log(err);
			this.handleSaveError();
		}
	}

	updateQuillEditor(figure_id, image) {
		const range = this.quill.getSelection(true);
		const figure = this.figure;
		const value = this.textbox.value;
		const imageSrc = base_url + "/" + image;

		this.quill.insertEmbed(range.index, "figure", {
			id: figure_id,
			src: imageSrc,
			caption: value,
		});
	}

	async hide() {
		super.hide();
	}

	showSuccessToast() {
		createToast({
			type: "success",
			status: "Successful",
			message: "Figure added successfully",
		});
	}

	showFailureToast(error) {
		createToast({
			type: "error",
			status: "Failed!",
			message: error,
		});
	}

	showEmptyValueError() {
		createToast({
			type: "error",
			message: "You must enter a figure label to insert an image.",
			status: "Failed",
		});
	}

	handleSaveError() {
		createToast({
			type: "error",
			status: "Error!",
			message: "Something went wrong",
		});
	}
}
class CitationTooltip extends Quill.import("ui/tooltip") {
	constructor(quill, boundsContainer) {
		super(quill, boundsContainer);

		// Set a class for styling the tooltip
		this.root.classList.add("ql-citation-tooltip");

		this.root.innerHTML = `
			<input class="citation-input" type="text" placeholder="Enter citation">
			<button class="save-btn" type="button">Save</button>
			<button class="cancel-btn" type="button">Cancel</button>
		`;

		// Save references to elements
		this.textbox = this.root.querySelector(".citation-input");
		this.saveBtn = this.root.querySelector(".save-btn");
		this.cancelBtn = this.root.querySelector(".cancel-btn");

		// Bind event listeners
		this.saveBtn.addEventListener("click", (e) => this.save(e));
		this.cancelBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.hide(e);
		});
	}

	show(value, bounds) {
		this.textbox.value = value || "";
		super.show();

		if (bounds) {
			const containerBounds = this.quill.container.getBoundingClientRect();

			this.root.style.left = `${bounds.left + window.pageXOffset - containerBounds.left}px`;
			this.root.style.top = `${60}px`;
		}

		this.quill.focus();
	}

	hide() {
		super.hide();
	}

	async save(e) {
		e.preventDefault();

		const citation_name = this.textbox.value;
		let range = this.quill.getSelection(true);
		let citation_id = generateId("citation");
		try {
			if(selectedSection === 0){
				createToast({
					type: "error",
					status: "Failed",
					message: `Unable to Create Citation! Please Save Section`,
				});	
				return;
			}
			const res = await APIS.addCitation({
				citation_id,
				citation_name,
				book_id: selectedBook,
				chapter_id: selectedChapter || activeChapter,
				section_id: selectedSection
			});
			if (res.success) {
				this.quill.formatText(
					range.index,
					range.length,
					"citation",
					citation_id,
					Quill.sources.USER
				);
				updateCitationList();
				this.hide();
				createToast({
					type: "success",
					status: "Successful",
					message: "Citation added successfully",
				});
			} else {
				createToast({ type: "error", status: "Failed!", message: res.error });
			}
		} catch (err) {
			createToast({ type: "error", status: "Error!", message: "Something went wrong" });
		}
	}
}

Quill.register({
	"modules/figureTooltip": FigureTooltip,
	"modules/citationTooltip": CitationTooltip,
	"formats/figure": FigureBlot,
	"formats/citation": CitationBlot,
});

const citationHandler = (value) => {
	let range = quill.getSelection();
	console.log({ range });
	if (range && range.length > 0) {
		const value = quill.getText(range.index, range.length);
		const bounds = quill.getBounds(range);
		const citationTooltip = quill.getModule("citationTooltip");
		citationTooltip.show(value, bounds);
	}
};

const imageHandler = async () => {
	const input = document.createElement("input");
	input.setAttribute("type", "file");
	input.setAttribute("accept", "image/*");
	input.click();

	input.onchange = () => {
		const file = input.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const figure_image = e.target.result;
				const figureTooltip = quill.getModule("figureTooltip");
				figureTooltip.show({ figure_image });
			};
			reader.readAsDataURL(file);
		}
	};
};

let quill = new Quill("#editor", {
	theme: "snow",
	modules: {
		toolbar: {
			handlers: {
				image: imageHandler,
				citation: citationHandler,
			},
			container: toolbarOptions,
		},
		citationTooltip: true,
		figureTooltip: true,
	},
});

const toolbar = quill.getModule("toolbar");
if (toolbar) {
	const citationButton = toolbar.container.querySelector(".ql-citation");
	if (citationButton) {
		citationButton.textContent = "Cite";
	}
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

// BOOKS CRUD

modal._element.addEventListener("hidden.bs.modal", function () {
	document.getElementById("modalForm").reset();
	document.getElementById("image").value = "";
	document.getElementById("imagePreview").innerHTML = "";
	selectedBook = 0;
});

async function updateBook(formData, payload) {
	try {
		let res;
		if (selectedBook) {
			res = await APIS.updateBook(selectedBook, payload, false);
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
	const payload = { book_title, author, description };
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

				await updateBook(formData, { ...payload, image: base64String });
			})
			.catch((error) => {
				console.error("Error in file reading:", error);
			});
	} else {
		await updateBook(formData, { ...payload });
	}
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
			createToast({
				type: "success",
				status: "Successful",
				message: `Book deleted successfully`,
			});
			showBookList();
		} else {
			createToast({
				type: "error",
				status: "Failed",
				message: `Deleting book unsuccessfull`,
			});
		}
	} catch (err) {
		createToast({
			type: "error",
			status: "Failed",
			message: `Something went wrong`,
		});
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
		const bookName = document.createElement("h3");
		bookName.className = "book_name_value ";
		bookName.textContent = book_title;

		detailsHeader.appendChild(backButton);
		detailsHeader.appendChild(bookName);

		backButton.addEventListener("click", function () {
			selectedBook = 0;
			selectedChapter = 0;
			activeChapter = 0;
			document.getElementById("bookTitle").innerHTML = "";
			rightbar.style.display = "none";
			document.getElementById("content").style.display = "none";
			showBookList();
		});

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
		accordion.id = "chapter-accordion";

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
	try {
		const res = await APIS.fetchBooks();
		const books = res?.data || [];
		const list = document.getElementById("book-list");

		list.innerHTML = books.map((book) => createBookListItem(book)).join("");

		// Toggle visibility of elements based on whether a book is selected
		toggleBookDetailsVisibility(selectedBook != null);
	} catch (error) {
		console.error("Error fetching books: ", error);
		// Handle the error appropriately
	}
}

function toggleBookDetailsVisibility(show) {
	document.getElementById("rightbar").style.display = show ? "block" : "none";
	document.getElementById("bookDetails").style.display = show ? "none" : "block";
	document.getElementById("bookList").style.display = show ? "block" : "none";
}

function createBookListItem(book) {
	const li = document.createElement("li");
	li.id = book.id;
	li.className = "list-group-item d-flex justify-content-between align-items-center";
	li.innerHTML = renderAddBook(book);
	return li.outerHTML;
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
		createToast({ type: "error", status: "Failed", message: "Something went wrong" });
	}
}

async function showChapterList(elem) {
	const res = await APIS.fetchBook(selectedBook);
	if (res.success) {
		const book = res.data.book;
		const chapters = res.data?.chapters || [];
		const accordion = document.getElementById("chapter-accordion");
		accordion.innerHTML = "";

		chapters.forEach((chapter, i) => {
			if (i === 0 && !activeChapter) {
				activeChapter = chapter.id;
			}
			addChapterToList(chapter, listSections, elem);
		});

		document.getElementById("bookTitle").innerHTML = book.book_title;
	} else {
		console.log({ res }, "Error fetching");
	}
}

function handleChapterClick(id) {
	activeChapter = activeChapter === id ? 0 : id;
	showChapterList();
}

function scrollIntoView(id) {
	console.log({ id }, "Asdf");
	const element = document.getElementById(id);
	if (element) {
		element.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
	} else {
		console.log({ message: `Element with the id: ${id} not found` });
	}
}

function handleSectionClick(id) {
	activeSection = id;
	scrollIntoView(id);
	// showChapterList()
}

// Function to add a new chapter to the accordion
function renderChapterButton(id, chapterName) {
	const isActiveChapter = `${id}` === `${activeChapter}`;
	const chevronClass = isActiveChapter ? "rotateXFull" : "";
	return `
	<div class="d-flex" >
		<button onClick="handleChapterClick('${id}')" class="grid gap-3 btn-lg accordion-button collapsed add_chapter_accordion" type="button" data-bs-toggle="collapse" data-bs-target="#collapseChapter_${id}" aria-expanded="false" aria-controls="collapseChapter_${id}">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-down mr-3 ${chevronClass}">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
			${chapterName}
			</button>
			${renderChapterDropdown(id, chapterName)}			
	</div>`;
}

function renderChapterDropdown(id, name) {
	return `
        <button class="btn-lg accordion-button w-auto" type="button" id="chapterDropdownMenuButton_${id}" data-bs-toggle="dropdown" aria-expanded="false">
            ${moreOptionsIcon}
        </button>
        <ul class="dropdown-menu" aria-labelledby="chapterDropdownMenuButton_${id}">
            <li><a class="dropdown-item" onClick="editChapter('${id}', '${name}')" href="#">Edit</a></li>
            <li><a class="dropdown-item" href="#" onClick="chapterDeleteConfirmation('${id}')">Delete</a></li>
        </ul>`;
}

function renderAccordionContent(id, sections, chapterName) {
	const isActiveChapter = `${id}` === `${activeChapter}`;

	const accordionContentDiv = document.createElement("div");
	accordionContentDiv.id = `collapseChapter_${id}`;
	accordionContentDiv.className = `accordion-collapse collapse ${isActiveChapter ? "show" : ""}`;
	accordionContentDiv.setAttribute("aria-labelledby", `heading${id}`);
	accordionContentDiv.setAttribute("data-bs-parent", `#chapter-accordion-${id}`);

	const accordionBodyDiv = document.createElement("div");
	accordionBodyDiv.className = "accordion-body d-grid gap-2";

	const addButton = document.createElement("button");
	addButton.id = "prevButton";
	addButton.type = "button";
	addButton.className = "btn btn-dark accordion-button";
	addButton.textContent = "ADD A SECTION";
	addButton.addEventListener("click", () => addSection(activeChapter));
	accordionBodyDiv.appendChild(addButton);

	if (sections.length) {
		sections.forEach((section) => {
			const sectionElement = renderSection(section, id, chapterName);
			accordionBodyDiv.appendChild(sectionElement);
		});
	} else {
		const noContentDiv = document.createElement("div");
		noContentDiv.className = "accordion-body";
		noContentDiv.textContent = "No Content";
		accordionBodyDiv.appendChild(noContentDiv);
	}

	accordionContentDiv.appendChild(accordionBodyDiv);
	return accordionContentDiv;
}

function addChapterToList(chapter, callback, elem) {
	const { chapter_name, id, sections } = chapter;
	const accordion = document.getElementById(`chapter-accordion`);
	if (sections?.length && !activeSection) {
		activeSection = sections[0].id;
	}

	// Create the container for this chapter
	const chapterDiv = document.createElement("div");
	chapterDiv.className = "d-flex flex-column justify-content-between mb-2";

	// Append the chapter button and dropdown
	const chapterButton = renderChapterButton(id, chapter_name);

	chapterDiv.innerHTML = chapterButton;

	// Append the accordion content
	const accordionContent = renderAccordionContent(id, sections, chapter_name);
	chapterDiv.appendChild(accordionContent);

	// Append the new chapter to the accordion
	accordion.appendChild(chapterDiv);
	// accordion.appendChild(accordionContent);

	if (`${id}` === `${activeChapter}`) {
		callback(sections || [], elem);
	}
}

const moreOptionsIcon = `<svg width="20" height="20" viewBox="0 0 24 24">
		<path
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0m7 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"
		/>
	</svg>`;

function renderSection(section, id) {
	const sectionDiv = document.createElement("div");
	sectionDiv.className = "d-flex";

	const sectionButton = document.createElement("button");
	sectionButton.className =
		"btn-lg btn active rounded-0 border-0 border-bottom d-flex gap-3 w-100 text-left justify-content-between align-items-center";
	sectionButton.textContent = section.section_title;
	sectionButton.addEventListener("click", () => {
		console.log({ id });
		scrollIntoView(section.id);
	});

	const dropdownDiv = document.createElement("div");
	dropdownDiv.className = "dropdown h-100";

	const dropdownButton = document.createElement("button");
	dropdownButton.className =
		"h-100 btn-lg btn active d-flex gap-3 rounded-0 border-0 border-bottom text-left justify-content-between align-items-center dropdown-toggle";
	dropdownButton.setAttribute("type", "button");
	dropdownButton.setAttribute("data-bs-toggle", "dropdown");
	dropdownButton.setAttribute("aria-expanded", "false");
	dropdownButton.innerHTML = moreOptionsIcon; // Assuming moreOptionsIcon is a valid HTML string
	dropdownDiv.appendChild(dropdownButton);

	const dropdownMenu = document.createElement("ul");
	dropdownMenu.className = "dropdown-menu";
	dropdownMenu.setAttribute("aria-labelledby", `section_id${section.id}`);
	dropdownMenu.innerHTML = `
			<li><a class="dropdown-item" href="#" onclick="editSection('${id}', '${section.id}')">Edit</a></li>
			<li><a class="dropdown-item" href="#" onclick="sectionDeleteConfirmation('${section.id}')">Delete</a></li>
		`;
	dropdownDiv.appendChild(dropdownMenu);

	sectionDiv.appendChild(sectionButton);
	sectionDiv.appendChild(dropdownDiv);

	return sectionDiv;
}

// SECTION CRUD

function listSections(sections = [], elem) {
	const content = document.getElementById("content");
	content.style.display = "block";
	content.innerHTML = "";
	console.log({ sections });
	if (sections.length) {
		sections.forEach((section) => {
			const sectionDiv = document.createElement("div");
			sectionDiv.className = "content-section";

			const innerDiv = document.createElement("div");
			innerDiv.id = `${section.id}`;
			innerDiv.innerHTML = `${section.content}`;

			sectionDiv.appendChild(innerDiv);
			content.appendChild(sectionDiv);
		});
	} else {
		content.innerHTML = "No content";
	}
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

sectionForm.removeEventListener("submit", saveSection);
async function saveSection() {
	const section_title = document.getElementById("sectionTitle").value.trim();
	const content = quill.root.innerHTML;
	const c = quill.getContents();
	console.log(c);
	console.log({ content });

	if (!section_title) {
		return;
	}
	const section = {
		section_title,
		content,
	};
	try {
		let res;

		if (activeSection) {
			res = await APIS.updateSection(activeSection, section);
		} else {
			res = await APIS.addSection(selectedBook, selectedChapter || activeChapter, section);
		}
		if (res.success) {
			showChapterList();
			quill.setContents([]);
			selectedSection = 0;
			document.getElementById("sectionForm").reset();
			addSectionModal.hide();
			createToast({
				type: "success",
				status: "Successful",
				message: `Section ${activeSection ? "updated" : "added"} successfully`,
			});
		} else {
			createToast({ type: "error", status: "Failed!", message: res.error });
		}
	} catch (err) {
		console.log({ err });
		createToast({ type: "error", status: "Failed!", message: "Something went wrong" });
	}
}
sectionForm.addEventListener("submit", saveSection);

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
			deleteConfirmationModal.hide();
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
}
async function deleteSection(id) {
	try {
		const res = await APIS.deleteSection(id);
		if (res.success) {
			createToast({
				type: "success",
				status: "Successful",
				message: `Section deleted successfully`,
			});
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
// Function to show delete confirmation modal
function showDeleteConfirmation(itemId) {
	deleteConfirmationModal.show();

	const confirmButton = document.getElementById("confirmDeleteBtn");
	const cancelButton = document.getElementById("cancelConfirmationModal");
	// Set up event listener for delete confirmation button
	confirmButton.removeEventListener("click", confirmButton.clickHandler);

	confirmButton.clickHandler = () => {
		deleteBook(itemId);
	};
	confirmButton.addEventListener("click", confirmButton.clickHandler);

	cancelButton.removeEventListener("click", cancelButton.clickHandler);

	cancelButton.clickHandler = () => {
		deleteConfirmationModal.hide();
	};
	cancelButton.addEventListener("click", cancelButton.clickHandler);
}
// Function to show delete confirmation modal for chapters
function chapterDeleteConfirmation(id) {
	deleteConfirmationModal.show();

	const confirmButton = document.getElementById("confirmDeleteBtn");
	const cancelButton = document.getElementById("cancelConfirmationModal");
	// Set up event listener for delete confirmation button
	confirmButton.removeEventListener("click", confirmButton.clickHandler);

	confirmButton.clickHandler = () => {
		deleteChapter(id);
	};
	confirmButton.addEventListener("click", confirmButton.clickHandler);

	cancelButton.removeEventListener("click", cancelButton.clickHandler);

	cancelButton.clickHandler = () => {
		selectedChapter = 0;
		document.getElementById("chapterForm").reset();
		deleteConfirmationModal.hide();
	};
	cancelButton.addEventListener("click", cancelButton.clickHandler);
}
function sectionDeleteConfirmation(id) {
	deleteConfirmationModal.show();

	const confirmButton = document.getElementById("confirmDeleteBtn");
	const cancelButton = document.getElementById("cancelConfirmationModal");
	// Set up event listener for delete confirmation button
	confirmButton.removeEventListener("click", confirmButton.clickHandler);

	confirmButton.clickHandler = () => {
		deleteSection(id);
	};

	confirmButton.addEventListener("click", confirmButton.clickHandler);
	cancelButton.removeEventListener("click", cancelButton.clickHandler);

	cancelButton.clickHandler = () => {
		selectedSection = 0;
		document.getElementById("sectionForm").reset();
		deleteConfirmationModal.hide();
	};
	cancelButton.addEventListener("click", cancelButton.clickHandler);
}

// Function to show delete confirmation modal
function deleteFigureAndCitationModal(key, id) {
	deleteConfirmationModal.show();

	const confirmButton = document.getElementById("confirmDeleteBtn");
	const cancelButton = document.getElementById("cancelConfirmationModal");
	// Set up event listener for delete confirmation button
	confirmButton.removeEventListener("click", confirmButton.clickHandler);

	confirmButton.clickHandler = () => {
		deleteFigureAndCitation(key, id);
	};

	confirmButton.addEventListener("click", confirmButton.clickHandler);
	cancelButton.removeEventListener("click", cancelButton.clickHandler);

	cancelButton.clickHandler = () => {
		deleteConfirmationModal.hide();
	};
	cancelButton.addEventListener("click", cancelButton.clickHandler);
}

async function updateCitationList() {
	const figureDiv = document.getElementById("citations-container");
	figureDiv.innerHTML = "";

	try {
		const res = await APIS.getCitations(selectedBook);
		if (res.success) {
			const citations = res.data || [];
			citations.forEach((citation) => {
				const figureElement = createCitationListItem(citation);
				figureDiv.appendChild(figureElement);
			});
		} else {
			createToast({ type: "error", status: "Failed!", message: res.error });
		}
	} catch (err) {
		createToast({ type: "error", status: "Error!", message: "Something went wrong" });
	}
}

// async function updateCitationList() {
// 	let citationsDiv = document.getElementById("citations-container");
// 	citationsDiv.innerHTML = "";
// 	try {
// 		const res = await APIS.getCitations(selectedBook);
// 		if (res.success) {
// 			const citations = res.data || [];
// 			for (let i = 0; i < citations.length; i++) {
// 				let citationElement = document.createElement("li");
// 				citationElement.innerHTML = `
// 						<a href="#${citations[i].citation_id}" onClick="scrollIntoElem('${citations[i].chapter_id}', '${citations[i].citation_id}}')">
// 							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
// 							 ${citations[i].citation_name}
// 						</a>
// 						<svg onClick="deleteFigureAndCitationModal('citation','${citations[i].citation_id}')" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
// 						`;
// 				citationsDiv.appendChild(citationElement);
// 			}
// 			console.log({ res });
// 		} else {
// 			createToast({ type: "error", status: "Failed!", message: res.error });
// 		}
// 	} catch (err) {
// 		createToast({ type: "error", status: "Error!", message: "Something went wrong" });
// 	}
// }

const scrollIntoElem = async (chapter, id) => {
	console.log({ id, a: document.getElementById(id) });
	if (document.getElementById(id)) {
		scrollIntoView(id);
	} else {
		selectedChapter = chapter;
		activeChapter = chapter;
		await showChapterList(id);
		scrollIntoView(id);
	}
};

async function updateFigureList() {
	const figureDiv = document.getElementById("figures-container");
	figureDiv.innerHTML = "";

	try {
		const res = await APIS.getFigures(selectedBook);
		if (res.success) {
			const figures = res.data || [];
			figures.forEach((figure) => {
				const figureElement = createFigureListItem(figure);
				figureDiv.appendChild(figureElement);
			});
		} else {
			createToast({ type: "error", status: "Failed!", message: res.error });
		}
	} catch (err) {
		createToast({ type: "error", status: "Error!", message: "Something went wrong" });
	}
}

function createFigureListItem(figure) {
	const figureElement = document.createElement("li");

	// Create div for figure details
	const figureDetails = document.createElement("div");
	const figureAction = document.createElement("div");
	figureDetails.setAttribute('class', "figure-ref")
	figureDetails.addEventListener("click", () => {
		scrollIntoElem(figure.chapter_id, figure.figure_id);
	});

	// Add figure details
	figureDetails.innerHTML = `
        <i>
			<svg width="20" height="20" viewBox="0 0 1920 1536">
				<path
					fill="currentColor"
					d="M640 448q0 80-56 136t-136 56t-136-56t-56-136t56-136t136-56t136 56t56 136zm1024 384v448H256v-192l320-320l160 160l512-512zm96-704H160q-13 0-22.5 9.5T128 160v1216q0 13 9.5 22.5t22.5 9.5h1600q13 0 22.5-9.5t9.5-22.5V160q0-13-9.5-22.5T1760 128zm160 32v1216q0 66-47 113t-113 47H160q-66 0-113-47T0 1376V160Q0 94 47 47T160 0h1600q66 0 113 47t47 113z" />
			</svg>
			${figure.figure_name}
        </i>
    `;

	// Keep the original SVG for delete functionality
	figureAction.innerHTML += `
        <svg onclick="deleteFigureAndCitationModal('figure','${figure.figure_id}')" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    `;
	figureElement.appendChild(figureDetails);
	figureElement.appendChild(figureAction);


	return figureElement;
}
function createCitationListItem(citation) {
	const figureElement = document.createElement("li");

	// Create div for figure details
	const figureDetails = document.createElement("div");
	const figureAction = document.createElement("div");
	figureDetails.setAttribute('class', "figure-ref")
	figureDetails.addEventListener("click", () => {
		scrollIntoElem(citation.citation_id, citation.citation_id);
	});

	// Add figure details
	figureDetails.innerHTML = `
        <i>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
			${citation.citation_name}
        </i>
    `;

	// Keep the original SVG for delete functionality
	figureAction.innerHTML += `
        <svg onclick="deleteFigureAndCitationModal('citation','${citation.citation_id}')" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    `;
	figureElement.appendChild(figureDetails);
	figureElement.appendChild(figureAction);


	return figureElement;
}

const deleteFigureAndCitation = async (key, id) => {
	try {
		let res;
		if (key === "figure") {
			res = await APIS.deleteFigure(id);
		} else {
			res = await APIS.deleteCitation(id);
		}
		if (res.success) {
			deleteConfirmationModal.hide();
			createToast({
				type: "success",
				status: "Successful",
				message: `Deleted ${key} successfully`,
			});
			if (key === "figure") {
				updateFigureList();
			} else {
				updateCitationList();
			}
		} else {
			createToast({ type: "error", status: "Failed!", message: res.error });
		}
	} catch (err) {
		createToast({ type: "error", status: "Failed!", message: "Something went wrong" });
	}
};

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

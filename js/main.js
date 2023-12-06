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

# 📋 Kanban Board

An interactive Kanban board built using **HTML, CSS, and JavaScript**. It helps users organise work into columns, move cards between stages with drag and drop, and track progress at a glance.

## ✨ Features

- Default columns: To Do, In Progress, Review, and Done.
- Add, rename, and delete columns.
- Add, edit, and delete cards with a title, description, priority, due date, and label.
- Drag and drop cards between columns, and reorder them inside a column.
- Arrow buttons on each card to move it left or right (useful on touch screens and keyboards).
- WIP (work in progress) limit per column, with a full-column warning.
- "Done" columns mark cards as completed and record the completion time.
- Overdue cards are highlighted in red until they are moved to a Done column.
- Search cards and filter them by priority.
- Live stats: total cards, completed cards, and overdue cards.
- Data is saved with localStorage, so the board stays after a page refresh.
- Export the board to a JSON file and import it back.
- "Clear done" and "Reset" buttons.
- Dark and light mode, remembered after refresh.
- Empty-state messages for empty columns and an empty board.
- Responsive design for different screen sizes.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure, layout, and dialog forms |
| CSS3 | Styling, CSS variables, flexbox, and responsive design |
| JavaScript | Task management, drag and drop, and DOM manipulation |
| localStorage | Saving the board and the theme in the browser |

## 📁 Project Structure

```
Kanban-Board/
│
├── index.html
├── style.css
└── script.js
```

## Installation

Clone the repository using the following command:

```
git clone https://github.com/shiprasonal/Kanban-Board.git
```

Open the cloned project folder and launch `index.html` in your web browser.

**Repository Link:** [Kanban Board](https://github.com/shiprasonal/Kanban-Board)

## 🔎 How to Use

1. Click **+ Add card** inside a column to create a card.
2. Drag a card to another column, or use the ◀ ▶ buttons, to change its stage.
3. Double-click a card (or click ✎) to edit it.
4. Click **+ Column** to create your own stage, and set a WIP limit if needed.
5. Use **Export** and **Import** to back up and restore your board.

## 💡 What I Learned

- Working with JavaScript DOM manipulation.
- Using the HTML5 drag and drop API.
- Handling user interactions and events.
- Managing application state and saving it with localStorage.
- Building forms with the HTML dialog element and validating input.
- Creating structured, responsive layouts using HTML and CSS.

## 👩‍💻 Author

**Shipra Sonal**

[GitHub](https://github.com/shiprasonal) · [LinkedIn](https://www.linkedin.com/in/shipra-sonal-554a50258)

---

⭐ If you find this project interesting, feel free to explore the repository!

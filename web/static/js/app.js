let currentQuestionId;
let categories;
let activeCategories;
let editor;
let editorChanged;

function renderQuestion(question) {
  const cardPrototype = $('#question-card-prototype');
  const oldCards = $('.question-card:not(#question-card-prototype)');
  const newCard = cardPrototype.clone();
  
  newCard.removeAttr('id');
  newCard.find('.question-card-number').text(question.id);
  newCard.find('.question-card-category').text(question.category.name);
  newCard.find('.question-card-text').text(question.text);
  newCard.find('.question-card-header').css('background-color', question.category.color);
  $('.container').append(newCard);
  editor = new SimpleMDE({
    element: newCard.find('.question-card-answer textarea')[0],
    spellChecker: false,
    placeholder: 'Escribir una respuesta',
    toolbar: false,
    status: false,
    initialValue: question.answer,
  });
  editor.codemirror.on("change", () => editorChanged = true);
  editorChanged = false;

  oldCards.remove();
  newCard.show();
}

function renderNoQuestion() {
  const cardPrototype = $('#question-card-prototype');
  const oldCards = $('.question-card:not(#question-card-prototype)');
  const newCard = cardPrototype.clone();

  newCard.removeAttr('id');
  newCard.find('.question-card-header').remove();
  newCard.find('.question-card-text').text("No quedan más preguntas.");
  newCard.find('.question-card-answer').remove();
  newCard.find('.question-card-footer').remove();
  $('.container').append(newCard);

  oldCards.remove();
  newCard.show();
}

function renderCategory(category) {
  const categoryPrototype = $('#category-prototype');
  const newCategory = categoryPrototype.clone();
  
  newCategory.removeAttr('id');
  newCategory.data('name', category.name);
  newCategory.find('.category-name').text(category.name);
  newCategory.find('.toggle-switch').data('color', category.color);
  toggleSwitch(newCategory.find('.toggle-switch'));
  $('.sidebar-categories ul').append(newCategory);

  newCategory.show();
}

function updateStats() {
  const data = !activeCategories || activeCategories.length == categories.length ?
    undefined : { categories: activeCategories };
  $.ajax({
    url: `${host}/stats`,
    data,
    method: 'get',
  })
    .done((res) => {
      $('.progress-bar-inner').css('width', `${res.skippedQuestions / res.totalQuestions * 100}%`);
      $('.progress-text-done').text(res.skippedQuestions);
      $('.progress-text-total').text(res.totalQuestions);
      $('.progress').show();
    });
}

function loadCategories() {
  $.get(`${host}/category`)
  .done((res) => {
    categories = res.map(c => c.name);
    activeCategories = categories;
    res.forEach(c => renderCategory(c));
  })
}

function updateQuestion() {
  const data = !activeCategories || activeCategories.length == categories.length ?
    undefined : { categories: activeCategories };
  $.ajax({
    url: `${host}/question/random`,
    data,
    method: 'get',
  })
    .done((res) => {
      currentQuestionId = res.id;
      renderQuestion(res);
    })
    .fail((res) => {
      if (currentQuestionId !== null) {
        currentQuestionId = null;
        renderNoQuestion();
      }
    })
}

function saveQuestionAnswer() {
  if (editorChanged) {    
    return $.ajax({
      url: `${host}/question/${currentQuestionId}`,
      data: JSON.stringify({
        answer: editor.value(),
      }),
      contentType: "application/json; charset=utf-8",
      method: 'patch',
    })
  }
}

function markQuestionAsCorrect() {
  return $.ajax({
    url: `${host}/question/${currentQuestionId}`,
    data: JSON.stringify({
      correct: true,
    }),
    contentType: "application/json; charset=utf-8",
    method: 'patch',
  })
}

function resetQuestions() {
  return $.ajax({
    url: `${host}/question/reset`,
    method: 'post',
  })
    .done(() => {
      if (currentQuestionId === null) {
        updateQuestion();
      }
    });
}

$(document).ready(() => {
  categoryName = $('.container').data('category');

  loadCategories();
  updateQuestion();
  updateStats();

  $(document).on('click', '.question-button-fail', () => {
    manageQuestionFail();
  });

  $(document).on('click', '.question-button-ok', () => {
    manageQuestionOk();
  });

  $(document).on('keydown', (e) => {
    if (!$(e.target).is('textarea')) {
      const key = e.originalEvent.key;
      if (key == 'q' || key == 'Q') {
        $('.question-button-fail').focus();
        setTimeout(manageQuestionFail, 200);
      } else if (key == 'p' || key == 'P') {
        $('.question-button-ok').focus();
        setTimeout(manageQuestionOk, 200);
      }
    }
  });

  $(document).on('click', '#reset-questions', () => {
    resetQuestions();
    updateStats();
  });

  $(document).on('click', '.toggle-switch, .toggle-knob', (e) => {
    e.stopPropagation();
    toggleSwitch($(e.target).closest('.toggle-switch'));
  });

  $(document).on('click', '.sidebar-category .toggle-switch, .sidebar-category .toggle-knob', (e) => {
    e.stopPropagation();
    const categoryName = $(e.target).closest('.sidebar-category').data('name');
    toggleCategory(categoryName);
  });

  $(document).on('click', '.sidebar-toggle', () => {
    toggleSidebar();
  });
});

function manageQuestionFail() {
  $.when(
    saveQuestionAnswer(),
  )
    .done(() => updateQuestion());
}

function manageQuestionOk() {
  $.when(
    saveQuestionAnswer(),
    markQuestionAsCorrect(),
  )
    .done(() => {
      updateStats();
      updateQuestion();
    });
}

function toggleSwitch(element) {
  element.toggleClass('active');
  if (element.hasClass('active')) {
    element.css('background-color', element.data('color'));
  } else {
    element.css('background-color', '');
  }
}

function toggleSidebar() {
  $('.sidebar').toggleClass('visible');
}

function toggleCategory(categoryName) {
  if (activeCategories.includes(categoryName)) {
    activeCategories = activeCategories.filter(c => c !== categoryName);
  } else {
    activeCategories.push(categoryName);
  }
  updateStats();
  if (currentQuestionId === null) {
    updateQuestion();
  }
}

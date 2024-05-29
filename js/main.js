function calculatePrice() {
  const form = document.getElementById("uploadForm");
  const formData = new FormData(form);

  const selectedLanguages = Array.from(document.querySelectorAll(".multi-select-option.multi-select-selected")).map((option) => option.dataset.value);

  const priceElement = document.getElementById("priceElement");
  const fileInput = document.getElementById("fileInput");

  if (!priceElement) {
    console.error("Price element not found");
    return;
  }

  if (selectedLanguages.length === 0) {
    priceElement.textContent = "$0.00";
    return;
  }

  formData.append("language", selectedLanguages.join(","));

  if (fileInput.files.length === 0) {
    priceElement.textContent = "$0.00";
    return;
  }

  priceElement.textContent = "Calculating...";

  fetch("/.netlify/functions/upload", {
    method: "POST",
    body: formData,
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    if (data.error) {
      console.error("Backend Error:", data.error);
      priceElement.textContent = "Error calculating price. Please try again.";
    } else {
      const amount = data.amount;
      priceElement.textContent = `$${amount}`;
    }
  })
  .catch((error) => {
    console.error("Error:", error);
    priceElement.textContent = `An error occurred: ${error.message}. Please try again.`;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById("fileInput");
  const fileLabel = document.querySelector("#file-dragDropBox .fileLabel");
  const contextFileInput = document.getElementById("contextfileInput");
  const contextFileContainer = document.getElementById("contextFileContainer");
  const qualitySelect = document.getElementById("quality");
  const turnaroundTimeSelect = document.getElementById("turnaroundTime");
  const dropArea = document.querySelector('.file-drag-area');
  const contextDropArea = document.querySelector('.context-drag-area');

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e, inputElement) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length === 1) {
      inputElement.files = files;
      inputElement.dispatchEvent(new Event("change"));
    }
  }

  function handleFileSelect(e, dropArea) {
    const file = e.target.files[0];
    if (!file) return;
    const validExtensions = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    if (!validExtensions.includes(file.type)) {
      alert('This is not a supported file format.');
      dropArea.classList.remove('active');
      return;
    }

    const fileNameElement = `<span class="file-name">${file.name}</span>`;
    dropArea.classList.add('active');
    dropArea.querySelectorAll('.fileLabel, .button').forEach(el => el.classList.add('hidden'));

    let existingFileNameElement = dropArea.querySelector('.file-name');
    if (existingFileNameElement) {
      existingFileNameElement.textContent = file.name;
    } else {
      dropArea.insertAdjacentHTML('beforeend', fileNameElement);
    }
    calculatePrice();
  }

  function setupDropArea(dropArea, inputElement) {
    dropArea.addEventListener('dragover', (event) => {
      preventDefaults(event);
      dropArea.classList.add('active');
    });

    dropArea.addEventListener('dragleave', (event) => {
      preventDefaults(event);
      dropArea.classList.remove('active');
    });

    dropArea.addEventListener('drop', (event) => {
      preventDefaults(event);
      handleDrop(event, inputElement);
    });

    dropArea.addEventListener('click', () => inputElement.click());
  }

  setupDropArea(dropArea, fileInput);
  setupDropArea(contextDropArea, contextFileInput);

  fileInput.addEventListener('change', (e) => handleFileSelect(e, dropArea));
  contextFileInput.addEventListener('change', (e) => handleFileSelect(e, contextDropArea));

  qualitySelect.addEventListener("change", function () {
    if (qualitySelect.value === "Business specific") {
      contextFileContainer.style.display = "block";
    } else {
      contextFileContainer.style.display = "none";
      contextFileInput.value = "";
      contextDropArea.querySelector('.file-name')?.remove();
      contextDropArea.querySelectorAll('.fileLabel, .button').forEach(el => el.classList.remove('hidden'));
    }
    calculatePrice();
  });

  turnaroundTimeSelect.addEventListener("change", calculatePrice);

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    generateStripePaymentLink(e);
  });
});

function generateStripePaymentLink(e) {
  e.preventDefault();

  grecaptcha.ready(function () {
    grecaptcha.execute("6LcbydcpAAAAAHmNRQHo6rWbUQcV5Ub7lTepkOQq", { action: "submit" }).then(function (token) {
      const form = document.getElementById("uploadForm");
      const formData = new FormData(form);
      formData.append("g-recaptcha-response", token);

      const payButtonEl = document.getElementById("payButton");
      payButtonEl && (payButtonEl.style.display = "none");
      const payButtonLoading = document.getElementById("payButtonLoading");
      payButtonLoading && (payButtonLoading.style.display = "block");

      fetch("/.netlify/functions/create-stripe-payment", {
        method: "POST",
        body: formData,
      })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error("Error generating Stripe payment link:", data.error);
          alert("An error occurred while generating the payment link. Please try again.");
        } else {
          window.location.href = data.paymentLink;
        }
      })
      .catch((error) => {
        console.error("Error generating Stripe payment link:", error);
        alert("An error occurred while generating the payment link. Please try again.");
      })
      .finally(() => {
        const payButtonEl = document.getElementById("payButton");
        payButtonEl && (payButtonEl.style.display = "block");
        const payButtonLoading = document.getElementById("payButtonLoading");
        payButtonLoading && (payButtonLoading.style.display = "none");
      });
    });
  });
}

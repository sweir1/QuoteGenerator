function calculatePrice() {
  const form = document.getElementById("uploadForm");
  const formData = new FormData(form);

  const selectedLanguages = Array.from(document.querySelectorAll(".multi-select-option.multi-select-selected")).map((option) => option.dataset.value);

  if (selectedLanguages.length === 0) {
    const priceElement = document.getElementById("priceElement");
    priceElement.textContent = "$0.00";
    return;
  }

  formData.append("language", selectedLanguages.join(","));

  const priceElement = document.getElementById("priceElement");

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
  const fileLabel = document.getElementById("fileLabel");
  const contextFileInput = document.getElementById("contextFileInput");
  const contextFileLabel = document.getElementById("contextFileLabel");
  const qualitySelect = document.getElementById("quality");
  const contextFileContainer = document.getElementById("contextFileContainer");
  const turnaroundTimeSelect = document.getElementById("turnaroundTime");

  // Update label text when file is selected
  fileInput.addEventListener("change", function (e) {
    if (fileInput.files.length === 0) {
      fileLabel.textContent = "Choose file or drag and drop";
      calculatePrice();
    } else {
      const fileName = e.target.files[0].name;
      const allowedExtensions = [".doc", ".docx", ".pdf", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
      const fileExtension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

      if (allowedExtensions.includes(fileExtension)) {
        fileLabel.textContent = fileName;
        calculatePrice();
      } else {
        fileInput.value = "";
        fileLabel.textContent = "Choose file or drag and drop";
        alert("Only Word, PDF, Excel, PPT, and text files are allowed.");
      }
    }
  });

  // Update label text when context file is selected
  contextFileInput.addEventListener("change", function (e) {
    if (contextFileInput.files.length === 0) {
      contextFileLabel.textContent = "Choose context file or drag and drop";
    } else {
      const fileName = e.target.files[0].name;
      const allowedExtensions = [".doc", ".docx", ".pdf", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
      const fileExtension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

      if (allowedExtensions.includes(fileExtension)) {
        contextFileLabel.textContent = fileName;
      } else {
        contextFileInput.value = "";
        contextFileLabel.textContent = "Choose context file or drag and drop";
        alert("Only Word, PDF, Excel, PPT, and text files are allowed.");
      }
    }
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const dropZone = e.target.closest(".custom-file-label");

    if (dropZone) {
      const inputElement = dropZone.previousElementSibling;

      if (files.length === 1) {
        inputElement.files = files;
        inputElement.dispatchEvent(new Event("change"));
      }
    }
  }

  const customFileLabels = document.querySelectorAll(".custom-file-label");

  customFileLabels.forEach((label) => {
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      label.addEventListener(eventName, preventDefaults, false);
    });

    label.addEventListener("drop", handleDrop, false);
  });

  qualitySelect.addEventListener("change", function () {
    if (qualitySelect.value === "Business specific") {
      contextFileContainer.style.display = "block";
    } else {
      contextFileContainer.style.display = "none";
      contextFileInput.value = "";
      contextFileLabel.textContent = "Choose context file or drag and drop";
    }
    calculatePrice();
  });

  turnaroundTimeSelect.addEventListener("change", function () {
    calculatePrice();
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
            if (data.error === "reCAPTCHA verification failed") {
              alert("reCAPTCHA verification failed. Please try again.");
            } else {
              alert("An error occurred while generating the payment link. Please try again.");
            }
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

  const form = document.getElementById("uploadForm");
  form.addEventListener("submit", generateStripePaymentLink);
});

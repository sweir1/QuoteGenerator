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
        updatePriceElement(0.0);
        return;
    }
    formData.append("language", selectedLanguages.join(","));
    if (fileInput.files.length === 0) {
        updatePriceElement(0.0);
        return;
    }
    priceElement.textContent = i18next.t("label.price", { price: "Calculating..." });

    fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/upload", {
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
                priceElement.textContent = i18next.t("label.price", { price: "Error" });
            } else {
                const amount = parseFloat(data.amount);
                if (isNaN(amount)) {
                    throw new Error("Invalid amount received");
                }
                updatePriceElement(amount);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            priceElement.textContent = i18next.t("label.price", { price: "Error" });
        });
}

function updatePriceElement(amount) {
    const formattedPrice = formatPrice(amount.toFixed(2), i18next.language);
    const priceText = i18next.t("label.price", { price: formattedPrice });
    const priceElement = document.getElementById("priceElement");
    if (priceElement) {
        priceElement.textContent = priceText;
    }
}

function formatPrice(price, language) {
    const priceFormat = i18next.t("priceFormat", { returnObjects: true });
    const decimalSeparator = priceFormat.decimalSeparator || ".";
    const currencySpacing = priceFormat.currencySpacing || "";

    const formattedPrice = price.replace(".", decimalSeparator);
    return formattedPrice + currencySpacing;
}

document.addEventListener("DOMContentLoaded", function () {
    // Function to ping the endpoints
    function warmUpFunctions() {
        // Warm up upload function
        try {
            fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/upload");
        } catch (error) {
            // Ignore any errors
        }

        // Warm up create-stripe-payment function
        try {
            fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/create-stripe-payment");
        } catch (error) {
            // Ignore any errors
        }

        // Warm up stripe-webhook function
        try {
            fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/stripe-webhook");
        } catch (error) {
            // Ignore any errors
        }
    }

    warmUpFunctions();

    const fileInput = document.getElementById("fileInput");
    const fileLabel = document.querySelector("#file-dragDropBox .fileLabel");
    const contextFileInput = document.getElementById("contextfileInput");
    const contextFileContainer = document.getElementById("contextFileContainer");
    const qualitySelect = document.getElementById("quality");
    const turnaroundTimeSelect = document.getElementById("turnaroundTime");
    const dropArea = document.querySelector(".file-drag-area");
    const contextDropArea = document.querySelector(".context-drag-area");

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
        const validExtensions = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"];

        if (!validExtensions.includes(file.type)) {
            alert("This is not a supported file format.");
            dropArea.classList.remove("active");
            return;
        }

        const fileNameElement = `<span class="file-name">${file.name}</span>`;
        dropArea.classList.add("active");
        dropArea.querySelectorAll(".fileLabel, .button").forEach((el) => el.classList.add("hidden"));

        let existingFileNameElement = dropArea.querySelector(".file-name");
        if (existingFileNameElement) {
            existingFileNameElement.textContent = file.name;
        } else {
            dropArea.insertAdjacentHTML("beforeend", fileNameElement);
        }
        calculatePrice();
    }

    function setupDropArea(dropArea, inputElement) {
        dropArea.addEventListener("dragover", (event) => {
            preventDefaults(event);
            dropArea.classList.add("active");
        });

        dropArea.addEventListener("dragleave", (event) => {
            preventDefaults(event);
            dropArea.classList.remove("active");
        });

        dropArea.addEventListener("drop", (event) => {
            preventDefaults(event);
            handleDrop(event, inputElement);
        });

        dropArea.addEventListener("click", () => inputElement.click());
    }

    setupDropArea(dropArea, fileInput);
    setupDropArea(contextDropArea, contextFileInput);

    fileInput.addEventListener("change", (e) => handleFileSelect(e, dropArea));
    contextFileInput.addEventListener("change", (e) => handleFileSelect(e, contextDropArea));

    qualitySelect.addEventListener("change", function () {
        if (qualitySelect.value === "Business specific") {
            contextFileContainer.style.display = "block";
        } else {
            contextFileContainer.style.display = "none";
            contextFileInput.value = "";
            contextDropArea.querySelector(".file-name")?.remove();
            contextDropArea.querySelectorAll(".fileLabel, .button").forEach((el) => el.classList.remove("hidden"));
        }
        calculatePrice();
    });

    turnaroundTimeSelect.addEventListener("change", calculatePrice);
});

function generateStripePaymentLink(e) {
    e.preventDefault();

    const selectedLanguages = Array.from(document.querySelectorAll(".multi-select-option.multi-select-selected")).map((option) => option.dataset.value);
    const fileInput = document.getElementById("fileInput");
    const qualitySelect = document.getElementById("quality");
    const contextFileInput = document.getElementById("contextfileInput");

    if (selectedLanguages.length === 0) {
        alert("Please select at least one language.");
        return;
    }

    if (fileInput.files.length === 0) {
        alert("Please select a file to upload.");
        return;
    }

    if (qualitySelect.value === "Business specific" && contextFileInput.files.length === 0) {
        alert("Please select a context file.");
        return;
    }

    grecaptcha.ready(function () {
        grecaptcha.execute("6LcbydcpAAAAAHmNRQHo6rWbUQcV5Ub7lTepkOQq", { action: "submit" }).then(function (token) {
            const form = document.getElementById("uploadForm");
            const formData = new FormData(form);
            formData.append("g-recaptcha-response", token);

            formData.append("language", selectedLanguages.join(","));
            if (fileInput.files.length === 0) {
                updatePriceElement(0.0);
                return;
            }

            const payButtonEl = document.getElementById("payButton");
            payButtonEl && (payButtonEl.style.display = "none");
            const payButtonLoading = document.getElementById("payButtonLoading");
            payButtonLoading && (payButtonLoading.style.display = "block");

            fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/create-stripe-payment", {
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

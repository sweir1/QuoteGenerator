class MultiSelect {
    constructor(element, options = {}) {
        let defaults = {
            placeholder: "Select language(s)",
            max: null,
            search: false,
            selectAll: false,
            listAll: true,
            name: "",
            width: "",
            height: "",
            dropdownWidth: "",
            dropdownHeight: "",
            data: [],
            onChange: function () {},
            onSelect: function () {},
            onUnselect: function () {},
        };
        this.options = Object.assign(defaults, options);
        this.selectElement = typeof element === "string" ? document.querySelector(element) : element;
        for (const prop in this.selectElement.dataset) {
            if (this.options[prop] !== undefined) {
                this.options[prop] = this.selectElement.dataset[prop];
            }
        }
        this.name = this.selectElement.getAttribute("name") ? this.selectElement.getAttribute("name") : "multi-select-" + Math.floor(Math.random() * 1000000);
        if (!this.options.data.length) {
            let options = this.selectElement.querySelectorAll("option");
            for (let i = 0; i < options.length; i++) {
                this.options.data.push({
                    value: options[i].value,
                    text: options[i].textContent,
                    selected: options[i].selected,
                    html: options[i].getAttribute("data-html"),
                });
            }
        }
        // Use the placeholder from options
        this.options.placeholder = this.options.placeholder || "Select language(s)";
        this.element = this._template();
        this.selectElement.replaceWith(this.element);
        this._updateSelected();
        this._eventHandlers();
    }

    _template() {
        let optionsHTML = "";
        for (let i = 0; i < this.data.length; i++) {
            optionsHTML += `
                <div class="multi-select-option${this.selectedValues.includes(this.data[i].value) ? " multi-select-selected" : ""}" data-value="${this.data[i].value}">
                    <span class="multi-select-option-radio"></span>
                    <span class="multi-select-option-text">${this.data[i].text}</span>
                </div>
            `;
        }
        let selectAllHTML = "";
        if (this.options.selectAll === true || this.options.selectAll === "true") {
            selectAllHTML = `<div class="multi-select-all">
                <span class="multi-select-option-radio"></span>
                <span class="multi-select-option-text">Select all</span>
            </div>`;
        }
        let template = `
            <div class="multi-select ${this.name}"${this.selectElement.id ? ' id="' + this.selectElement.id + '"' : ""} style="${this.width ? "width:" + this.width + ";" : ""}${this.height ? "height:" + this.height + ";" : ""}">
                ${this.selectedValues.map((value) => `<input type="hidden" name="${this.name}[]" value="${value}">`).join("")}
                <div class="multi-select-header" style="${this.width ? "width:" + this.width + ";" : ""}${this.height ? "height:" + this.height + ";" : ""}">
                    <span class="multi-select-header-placeholder">${this.options.placeholder}</span>
                </div>
                <div class="multi-select-options" style="${this.options.dropdownWidth ? "width:" + this.options.dropdownWidth + ";" : ""}${this.options.dropdownHeight ? "height:" + this.options.dropdownHeight + ";" : ""}">
                    ${this.options.search === true || this.options.search === "true" ? '<input type="text" class="multi-select-search" placeholder="Search...">' : ""}
                    ${selectAllHTML}
                    ${optionsHTML}
                </div>
            </div>
        `;
        let element = document.createElement("div");
        element.innerHTML = template.trim();
        return element.firstChild;
    }

    _eventHandlers() {
        let headerElement = this.element.querySelector(".multi-select-header");
        this.element.querySelectorAll(".multi-select-option").forEach((option) => {
            option.onclick = () => {
                let selected = true;
                if (!option.classList.contains("multi-select-selected")) {
                    if (this.options.max && this.selectedValues.length >= this.options.max) {
                        return;
                    }
                    option.classList.add("multi-select-selected");
                    if (this.options.listAll === true || this.options.listAll === "true") {
                        headerElement.insertAdjacentHTML("afterbegin", `<span class="multi-select-header-option" data-value="${option.dataset.value}">${option.querySelector(".multi-select-option-text").innerHTML}</span>`);
                    }
                    const multiSelectElement = this.element.querySelector(".multi-select");
                    if (multiSelectElement) {
                        multiSelectElement.insertAdjacentHTML("afterbegin", `<input type="hidden" name="${this.name}[]" value="${option.dataset.value}">`);
                    }
                    this.data.filter((data) => data.value == option.dataset.value)[0].selected = true;
                } else {
                    option.classList.remove("multi-select-selected");
                    this.element.querySelectorAll(".multi-select-header-option").forEach((headerOption) => (headerOption.dataset.value == option.dataset.value ? headerOption.remove() : ""));
                    // Check if the input element exists before removing it
                    const inputElement = this.element.querySelector(`input[value="${option.dataset.value}"]`);
                    if (inputElement) {
                        inputElement.remove();
                    }
                    this.data.filter((data) => data.value == option.dataset.value)[0].selected = false;
                    selected = false;
                }
                if (this.options.listAll === false || this.options.listAll === "false") {
                    if (this.element.querySelector(".multi-select-header-option")) {
                        this.element.querySelector(".multi-select-header-option").remove();
                    }
                    headerElement.insertAdjacentHTML("afterbegin", `<span class="multi-select-header-option">${this.selectedValues.length} selected</span>`);
                }
                if (!this.element.querySelector(".multi-select-header-option")) {
                    headerElement.querySelector(".multi-select-header-placeholder") || headerElement.insertAdjacentHTML("afterbegin", `<span class="multi-select-header-placeholder">${this.options.placeholder}</span>`);
                } else {
                    headerElement.querySelector(".multi-select-header-placeholder") && headerElement.querySelector(".multi-select-header-placeholder").remove();
                }
                if (this.options.max) {
                    this.element.querySelector(".multi-select-header-max").innerHTML = this.selectedValues.length + "/" + this.options.max;
                }
                if (this.options.search === true || this.options.search === "true") {
                    this.element.querySelector(".multi-select-search").value = "";
                }
                this.element.querySelectorAll(".multi-select-option").forEach((option) => (option.style.display = "flex"));
                headerElement.classList.remove("multi-select-header-active");
                this.options.onChange(option.dataset.value, option.querySelector(".multi-select-option-text").innerHTML, option);
                if (selected) {
                    this.options.onSelect(option.dataset.value, option.querySelector(".multi-select-option-text").innerHTML, option);
                } else {
                    this.options.onUnselect(option.dataset.value, option.querySelector(".multi-select-option-text").innerHTML, option);
                }
            };
        });
        headerElement.onclick = () => headerElement.classList.toggle("multi-select-header-active");
        if (this.options.search === true || this.options.search === "true") {
            let search = this.element.querySelector(".multi-select-search");
            search.oninput = () => {
                this.element.querySelectorAll(".multi-select-option").forEach((option) => {
                    option.style.display = option.querySelector(".multi-select-option-text").innerHTML.toLowerCase().indexOf(search.value.toLowerCase()) > -1 ? "flex" : "none";
                });
            };
        }
        if (this.options.selectAll === true || this.options.selectAll === "true") {
            let selectAllButton = this.element.querySelector(".multi-select-all");
            selectAllButton.onclick = () => {
                let allSelected = selectAllButton.classList.contains("multi-select-selected");
                this.element.querySelectorAll(".multi-select-option").forEach((option) => {
                    let dataItem = this.data.find((data) => data.value == option.dataset.value);
                    if (dataItem && ((allSelected && dataItem.selected) || (!allSelected && !dataItem.selected))) {
                        option.click();
                    }
                });
                selectAllButton.classList.toggle("multi-select-selected");
            };
        }
        if (this.selectElement.id && document.querySelector('label[for="' + this.selectElement.id + '"]')) {
            document.querySelector('label[for="' + this.selectElement.id + '"]').onclick = () => {
                headerElement.classList.toggle("multi-select-header-active");
            };
        }
        document.addEventListener("click", (event) => {
            if (!event.target.closest("." + this.name) && !event.target.closest('label[for="' + this.selectElement.id + '"]')) {
                headerElement.classList.remove("multi-select-header-active");
            }
        });
    }

    _updateSelected() {
        if (this.options.listAll === true || this.options.listAll === "true") {
            this.element.querySelectorAll(".multi-select-option").forEach((option) => {
                if (option.classList.contains("multi-select-selected")) {
                    this.element.querySelector(".multi-select-header").insertAdjacentHTML("afterbegin", `<span class="multi-select-header-option" data-value="${option.dataset.value}">${option.querySelector(".multi-select-option-text").innerHTML}</span>`);
                }
            });
        } else {
            if (this.selectedValues.length > 0) {
                this.element.querySelector(".multi-select-header").insertAdjacentHTML("afterbegin", `<span class="multi-select-header-option">${this.selectedValues.length} selected</span>`);
            }
        }
        if (this.element.querySelector(".multi-select-header-option")) {
            this.element.querySelector(".multi-select-header-placeholder").remove();
        }
    }

    get selectedValues() {
        return this.data.filter((data) => data.selected).map((data) => data.value);
    }

    get selectedItems() {
        return this.data.filter((data) => data.selected);
    }

    set data(value) {
        this.options.data = value;
    }

    get data() {
        return this.options.data;
    }

    set selectElement(value) {
        this.options.selectElement = value;
    }

    get selectElement() {
        return this.options.selectElement;
    }

    set element(value) {
        this.options.element = value;
    }

    get element() {
        return this.options.element;
    }

    set placeholder(value) {
        this.options.placeholder = value;
    }

    get placeholder() {
        return this.options.placeholder;
    }

    set name(value) {
        this.options.name = value;
    }

    get name() {
        return this.options.name;
    }

    set width(value) {
        this.options.width = value;
    }

    get width() {
        return this.options.width;
    }

    set height(value) {
        this.options.height = value;
    }

    get height() {
        return this.options.height;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const languageSelect = document.querySelector("#language");
    const placeholderText = languageSelect.getAttribute("data-placeholder") || "Select language(s)";

    new MultiSelect("#language", {
        placeholder: placeholderText, // Dynamic placeholder from data attribute
        onChange: function (value, text) {
            calculatePrice(); // Recalculate price on language change
        },
    });
});

class SingleSelect {
    constructor(element, options = {}) {
        let defaults = {
            placeholder: "Select an option",
            name: "",
            width: "",
            height: "",
            dropdownWidth: "",
            dropdownHeight: "",
            data: [],
            onChange: function () {},
        };
        this.options = Object.assign(defaults, options);
        this.selectElement = typeof element === "string" ? document.querySelector(element) : element;
        this.originalSelect = this.selectElement;
        this.name = this.selectElement.getAttribute("name") || "single-select-" + Math.floor(Math.random() * 1000000);

        if (!this.options.data.length) {
            let options = this.selectElement.querySelectorAll("option");
            this.options.data = Array.from(options).map(option => ({
                value: option.value,
                text: option.textContent,
                selected: option.selected
            }));
        }

        this.element = this._template();
        this.selectElement.parentNode.replaceChild(this.element, this.selectElement);
        this._updateSelected();
        this._eventHandlers();
    }

    _template() {
        let optionsHTML = this.options.data.map(item => `
            <div class="single-select-option${item.selected ? " single-select-selected" : ""}" data-value="${item.value}">
                <span class="single-select-option-text">${item.text}</span>
            </div>
        `).join('');

        let template = `
            <div class="single-select ${this.name}" style="${this.options.width ? "width:" + this.options.width + ";" : ""}${this.options.height ? "height:" + this.options.height + ";" : ""}">
                <input type="hidden" name="${this.name}" value="${this.selectedValue || ''}">
                <div class="single-select-header" style="${this.options.width ? "width:" + this.options.width + ";" : ""}${this.options.height ? "height:" + this.options.height + ";" : ""}">
                    <span class="single-select-header-placeholder">${this.options.placeholder}</span>
                </div>
                <div class="single-select-options" style="${this.options.dropdownWidth ? "width:" + this.options.dropdownWidth + ";" : ""}${this.options.dropdownHeight ? "height:" + this.options.dropdownHeight + ";" : ""}">
                    ${optionsHTML}
                </div>
            </div>
        `;
        let element = document.createElement("div");
        element.innerHTML = template.trim();
        return element.firstChild;
    }

    _eventHandlers() {
        let headerElement = this.element.querySelector(".single-select-header");
        this.element.querySelectorAll(".single-select-option").forEach((option) => {
            option.onclick = () => {
                this.element.querySelectorAll(".single-select-option").forEach(opt => opt.classList.remove("single-select-selected"));
                option.classList.add("single-select-selected");
                headerElement.innerHTML = `<span class="single-select-header-option">${option.querySelector(".single-select-option-text").innerHTML}</span>`;
                let selectedValue = option.dataset.value;
                this.element.querySelector('input[type="hidden"]').value = selectedValue;
                this.originalSelect.value = selectedValue;
                this.options.onChange(selectedValue, option.querySelector(".single-select-option-text").innerHTML, option);
                headerElement.classList.remove("single-select-header-active");

                // Trigger change event on the original select element
                const event = new Event('change', { bubbles: true });
                this.originalSelect.dispatchEvent(event);
            };
        });
        headerElement.onclick = () => headerElement.classList.toggle("single-select-header-active");
        document.addEventListener("click", (event) => {
            if (!event.target.closest("." + this.name)) {
                headerElement.classList.remove("single-select-header-active");
            }
        });
    }

    _updateSelected() {
        let selectedOption = this.options.data.find(item => item.selected);
        if (selectedOption) {
            this.element.querySelector(".single-select-header").innerHTML = `<span class="single-select-header-option">${selectedOption.text}</span>`;
            this.element.querySelector('input[type="hidden"]').value = selectedOption.value;
        }
    }

    get selectedValue() {
        return this.options.data.find(item => item.selected)?.value || '';
    }

    setValue(value) {
        const option = this.element.querySelector(`.single-select-option[data-value="${value}"]`);
        if (option) {
            option.click();
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    window.turnaroundTimeSelect = new SingleSelect("#turnaroundTime", {
        placeholder: "Select delivery time",
        onChange: function (value, text) {
            console.log("Delivery time changed:", text);
            calculatePrice();
        },
    });

    window.qualitySelect = new SingleSelect("#quality", {
        placeholder: "Select quality",
        onChange: function (value, text) {
            calculatePrice();
            const contextFileContainer = document.getElementById("contextFileContainer");
            if (value === "Business specific") {
                contextFileContainer.style.display = "block";
            } else {
                contextFileContainer.style.display = "none";
            }
        },
    });
});

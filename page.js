class Page {
    constructor(elementId){
        this.root = document.getElementById(elementId);
    }

    clearRoot(){
        this.clearElement(this.root);
    }

    clearElement(element){
        while(element.firstChild){
            element.removeChild(element.firstChild);
        }
    }
}

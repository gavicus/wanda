class Page {
    constructor(elementId){
        this.root = document.getElementById(elementId);
    }

    clearRoot(){
        this.clearElement(this.root);
    }

    clearElement(element){
        if(element[0]){
            element = element[0];
        }
        while(element.firstChild){
            element.removeChild(element.firstChild);
        }
    }
}

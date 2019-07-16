class Page {
    constructor(elementId){
        this.root = document.getElementById(elementId);
    }

    clearRoot(){
        while(this.root.firstChild){
            this.root.removeChild(this.root.firstChild);
        }
    }
}

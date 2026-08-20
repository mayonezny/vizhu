const func1 = () => {
    console.log("yolo bitch!");
}
let cosmos = [13, 15, 17, 19, 21, 66];
let res = cosmos.reduce((sum, mas) => (mas % 2 === 0 ? ++sum : sum), 0);
console.log(res);

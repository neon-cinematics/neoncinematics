import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const Section3 = () => {

    useGSAP(() => {
        gsap.from("#section3_main_div h1", {
            
        });
        
    });
    
    return (
        <>
            <div id="section3_main_div">
                <h1>
                    
                </h1>
            </div>
        </>
    )
}
export default Section3;
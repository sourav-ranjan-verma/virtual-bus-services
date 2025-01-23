$(document).ready(function () {
    let currentSectionIndex = 0;
    const sections = $("section");
    const totalSections = sections.length - 1;

    $("#prev").addClass("disabled");
    $("#submit").addClass("disabled");

    function showSection(index) {
        sections.hide().eq(index).fadeIn();
        $("#prev").toggleClass("disabled", index === 0);
        $("#next").toggleClass("disabled", index === totalSections);
        $("#submit").toggleClass("disabled", index !== totalSections);
    }

    $("#next").click(function () {
        if (currentSectionIndex < totalSections) {
            currentSectionIndex++;
            showSection(currentSectionIndex);
        }
    });

    $("#prev").click(function () {
        if (currentSectionIndex > 0) {
            currentSectionIndex--;
            showSection(currentSectionIndex);
        }
    });
});

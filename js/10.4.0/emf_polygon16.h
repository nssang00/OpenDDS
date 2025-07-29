void polypolygon16_draw(const char *name, const char *contents, FILE *out,
                        drawingStates *states, bool polygon) {
    UNUSED(name);
    unsigned int i;
    PU_EMRPOLYPOLYLINE16 pEmr = (PU_EMRPOLYPOLYLINE16)(contents);
    PU_POINT16 papts = (PU_POINT16)((char *)pEmr->aPolyCounts +
                                    sizeof(uint32_t) * pEmr->nPolys);
    returnOutOfEmf((intptr_t)papts +
                   (intptr_t)(pEmr->cpts) * sizeof(U_POINT16));

    int counter = 0;
    int polygon_index = 0;

    startPathDraw(states, out);

    for (i = 0; i < pEmr->cpts; i++) {
        if (counter == 0) {
            fprintf(out, "M ");
            addNewSegPath(states, SEG_MOVE);
        } else {
            fprintf(out, "L ");
            addNewSegPath(states, SEG_LINE);
        }
        pointCurrPathAdd16(states, papts[i], 0);     // polyline16과 같은 처리
        point16_draw(states, papts[i], out);

        counter++;
        if (pEmr->aPolyCounts[polygon_index] == counter) {
            if (polygon) {
                fprintf(out, "Z ");
                addNewSegPath(states, SEG_END);
            }
            counter = 0;
            polygon_index++;
        }
    }

    endPathDraw(states, out);
}

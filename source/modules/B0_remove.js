/* ===================== v9.49: Owner mode trims what doesn't belong =====================
 * Owners don't call plays, run camp battles, play pick'em or join friends leagues, and the rival front offices
 * give way to the other owners. Other modes keep all of these. */
const OWN_HIDE = ['pickem', 'friends', 'camp', 'rivals'];
{ const _tv = xTabVis; xTabVis = function (k) { if (isOwner() && OWN_HIDE.includes(k)) return false; return _tv(k); }; }
// live games are watch-only from the owner's suite
{ const _ps = proSettings; proSettings = function () { const h = _ps(); return isOwner() ? h.replace(/<div class="setrow"><div class="sl"><b>Tutorial<\/b>[\s\S]*?<\/button><\/div><\/div>/, '').replace(/<details[^>]*><summary[^>]*>College rules[\s\S]*?<\/details>/g, '').replace(/<div class="setrow"><div class="sl"><b>(Big calls in live games|Play clock|Rules preset|NFL overtime|NFL playoff teams|NFL salary cap growth|Job security|Injuries|NFL roster limit)<\/b>[\s\S]*?<\/div><div class="sctl">[\s\S]*?<\/div><\/div><\/div>/g, '') : h; }; }

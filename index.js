const clientId = 7330563;
const apiVersion = '5.103';

const timeout = 334;

document.addEventListener("DOMContentLoaded", function () {
    VK.Auth.getLoginStatus(function (data) {
        if (data.status === 'connected') {
            ready()
        } else {
            VK.UI.button('login')
        }
    })
});

function getNoun(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}

function login() {
    VK.Auth.login(function (data) {
        if (data.status === 'connected') {
            ready()
        }
    })
}

function ready() {
    document.getElementById('login').hidden = true;
    document.getElementById('input').hidden = false
}

function showProgress() {
    document.getElementById('progress').hidden = false
}

function hideProgress() {
    document.getElementById('progress').hidden = true
}

function setProgressMax(value) {
    document.getElementById('progress_bar').max = value
}

function updateProgress(value) {
    document.getElementById('progress_bar').value = value
}

function incProgress(value = 1) {
    document.getElementById('progress_bar').value += value
}

function fail() {
    document.getElementById('input').hidden = false;
    hideProgress()
}

function notFound() {
    fail();
    alert('Пользователь с таким идентификатором не найден!')
}

function done(year, month, day, user) {
    function withZeros(value, count) {
        let result = value + '';
        while (result.length < count) result = '0' + result;
        return result
    }

    document.getElementById('input').hidden = false;
    hideProgress();
    let msg = user.first_name + ' ' + user.last_name;
    msg += '\n';
    msg += (year === 0) ? '????' : year;
    msg += '.';
    msg += (month === 0) ? '??' : withZeros(month, 2);
    msg += '.';
    msg += (day === 0) ? '??' : withZeros(day, 2);
    if (year !== 0) {
        msg += '\n';
        let age = new Date(Date.now()).getUTCFullYear() - year - 1;
        if (month === 0) {
            msg += age + '-' + (age + 1);
            age++
        } else {
            const currentMonth = new Date(Date.now()).getUTCMonth() + 1;
            if (month > currentMonth) {
                msg += age
            } else if (month < currentMonth) {
                msg += age + 1;
                age++
            } else {
                if (day === 0) {
                    msg += age + '-' + (age + 1);
                    age++
                } else {
                    const currentDay = new Date(Date.now()).getUTCDate();
                    if (day > currentDay) {
                        msg += age
                    } else {
                        msg += age + 1;
                        age++
                    }
                }
            }
        }
        msg += ' ' + getNoun(age, 'год', 'года', 'лет')
    }
    alert(msg);
}

function search() {
    let lastReq;

    document.getElementById('input').hidden = true;
    updateProgress(0);
    showProgress();
    const userId = document.getElementById('user').value;
    VK.Api.call(
        'users.get',
        {v: apiVersion, user_ids: userId, fields: 'bdate,city,country,sex'},
        function (data) {
            lastReq = Date.now();
            if (data.response) {
                const user = data.response[0];

                const params = {
                    v: apiVersion,
                    q: user.first_name + ' ' + user.last_name,
                    sex: user.sex,
                    count: 1000,
                    offset: 0
                };
                if (user.country)
                    params['country'] = user.country.id;
                if (user.city)
                    params['city'] = user.city.id;
                if (user.bdate) {
                    const bdate = user.bdate.split('.');
                    if (bdate.length === 3) {
                        done(bdate[2], bdate[1], bdate[0], user);
                        return
                    }
                    if (bdate[0])
                        params['birth_day'] = bdate[0];
                    if (bdate[1])
                        params['birth_month'] = bdate[1];
                    if (bdate[2])
                        params['birth_year'] = bdate[2];
                }

                let y = 0;
                let m = 0;
                let d = 0;
                let year = new Date(Date.now()).getUTCFullYear();
                const years = year - 1900 + 1;
                let month = 1;
                let day = 1;

                setProgressMax(
                    (!params['birth_year'] ? years : 0) +
                    (!params['birth_month'] ? 12 : 0) +
                    (!params['birth_day'] ? 31 : 0)
                );

                function searchProbe(data) {
                    lastReq = Date.now();
                    for (let i = 0; i < data.response.items.length; i++) {
                        if (data.response.items[i].id === user.id) {
                            params['offset'] = 0;
                            if (!params['birth_year']) {
                                params['birth_year'] = year;
                                setTimeout(function () {
                                    VK.Api.call(
                                        'users.search',
                                        params,
                                        searchYear
                                    )
                                }, lastReq + timeout - Date.now());
                            } else {
                                y = params['birth_year'];
                                if (!params['birth_month']) {
                                    params['birth_month'] = month;
                                    setTimeout(function () {
                                        VK.Api.call(
                                            'users.search',
                                            params,
                                            searchMonth
                                        )
                                    }, lastReq + timeout - Date.now());
                                } else {
                                    m = params['birth_month'];
                                    params['birth_day'] = day;
                                    setTimeout(function () {
                                        VK.Api.call(
                                            'users.search',
                                            params,
                                            searchDay
                                        )
                                    }, lastReq + timeout - Date.now());
                                }
                            }
                            return
                        }
                    }
                    if (data.response.count === 1000) {
                        params['offset'] = params['offset'] + 1000;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchYear
                            );
                        }, lastReq + timeout - Date.now());
                        return;
                    }
                    fail();
                    alert('Не удаётся определить, возможно лимит исчерпан.')
                }

                function searchYear(data) {
                    lastReq = Date.now();
                    for (let i = 0; i < data.response.items.length; i++) {
                        if (data.response.items[i].id === user.id) {
                            incProgress(year - 1900 + 1);
                            y = year;
                            params['offset'] = 0;
                            if (!params['birth_month']) {
                                params['birth_month'] = month;
                                setTimeout(function () {
                                    VK.Api.call(
                                        'users.search',
                                        params,
                                        searchMonth
                                    )
                                }, lastReq + timeout - Date.now());
                            } else {
                                m = params['birth_month'];
                                if (!params['birth_day']) {
                                    params['birth_day'] = day;
                                    setTimeout(function () {
                                        VK.Api.call(
                                            'users.search',
                                            params,
                                            searchDay
                                        )
                                    }, lastReq + timeout - Date.now());
                                } else {
                                    d = params['birth_day'];
                                    done(y, m, d, user)
                                }
                            }
                            return
                        }
                    }
                    if (data.response.count === 1000) {
                        params['offset'] = params['offset'] + 1000;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchYear
                            );
                        }, lastReq + timeout - Date.now());
                        return;
                    }
                    incProgress();
                    year--;
                    params['offset'] = 0;
                    if (year < 1900) {
                        delete params['birth_year'];
                        if (!params['birth_month']) {
                            params['birth_month'] = month;
                            setTimeout(function () {
                                VK.Api.call(
                                    'users.search',
                                    params,
                                    searchMonth
                                )
                            }, lastReq + timeout - Date.now());
                        } else {
                            m = params['birth_month'];
                            if (!params['birth_day']) {
                                params['birth_day'] = day;
                                setTimeout(function () {
                                    VK.Api.call(
                                        'users.search',
                                        params,
                                        searchDay
                                    )
                                }, lastReq + timeout - Date.now());
                            } else {
                                d = params['birth_day'];
                                done(y, m, d, user)
                            }
                        }
                    } else {
                        params['birth_year'] = year;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchYear
                            )
                        }, lastReq + timeout - Date.now());
                    }
                }

                function searchMonth(data) {
                    lastReq = Date.now();
                    for (let i = 0; i < data.response.items.length; i++) {
                        if (data.response.items[i].id === user.id) {
                            incProgress(12 - month + 1);
                            m = month;
                            params['offset'] = 0;
                            if (!params['birth_day']) {
                                params['birth_day'] = day;
                                setTimeout(function () {
                                    VK.Api.call(
                                        'users.search',
                                        params,
                                        searchDay
                                    )
                                }, lastReq + timeout - Date.now());
                            } else {
                                d = params['birth_day'];
                                done(y, m, d, user)
                            }
                            return
                        }
                    }
                    if (data.response.count === 1000) {
                        params['offset'] = params['offset'] + 1000;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchMonth
                            );
                        }, lastReq + timeout - Date.now());
                        return;
                    }
                    incProgress();
                    month++;
                    params['offset'] = 0;
                    if (month > 12) {
                        delete params['birth_month'];
                        if (!params['birth_day']) {
                            params['birth_day'] = day;
                            setTimeout(function () {
                                VK.Api.call(
                                    'users.search',
                                    params,
                                    searchDay
                                )
                            }, lastReq + timeout - Date.now());
                        } else {
                            d = params['birth_day'];
                            done(y, m, d, user)
                        }
                    } else {
                        params['birth_month'] = month;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchMonth
                            )
                        }, lastReq + timeout - Date.now());
                    }
                }

                function searchDay(data) {
                    lastReq = Date.now();
                    for (let i = 0; i < data.response.items.length; i++) {
                        if (data.response.items[i].id === user.id) {
                            incProgress(31 - day + 1);
                            d = day;
                            done(y, m, d, user);
                            return
                        }
                    }
                    if (data.response.count === 1000) {
                        params['offset'] = params['offset'] + 1000;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchDay
                            );
                        }, lastReq + timeout - Date.now());
                        return;
                    }
                    incProgress();
                    day++;
                    params['offset'] = 0;
                    if (day > 31) {
                        done(y, m, d, user)
                    } else {
                        params['birth_day'] = day;
                        setTimeout(function () {
                            VK.Api.call(
                                'users.search',
                                params,
                                searchDay
                            )
                        }, lastReq + timeout - Date.now());
                    }
                }

                setTimeout(function () {
                    VK.Api.call(
                        'users.search',
                        params,
                        searchProbe
                    )
                }, lastReq + timeout - Date.now());
            } else {
                notFound()
            }
        }
    )
}
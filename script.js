
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('meal-date');
    const searchBtn = document.getElementById('search-btn');
    const loadingDiv = document.getElementById('loading');
    const mealInfoDiv = document.getElementById('meal-info');
    const errorDiv = document.getElementById('error-message');
    const mealDateDisplay = document.getElementById('meal-date-display');

    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    dateInput.value = formattedToday;

    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', searchMealInfo);
    
    // 엔터키로도 검색 가능
    dateInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMealInfo();
        }
    });

    // 페이지 로드 시 오늘 급식 정보 자동 조회
    searchMealInfo();

    async function searchMealInfo() {
        const selectedDate = dateInput.value;
        
        if (!selectedDate) {
            alert('날짜를 선택해주세요.');
            return;
        }

        // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
        const formattedDate = selectedDate.replace(/-/g, '');
        
        showLoading();
        hideResults();
        hideError();

        try {
            const mealData = await fetchMealData(formattedDate);
            displayMealInfo(mealData, selectedDate);
        } catch (error) {
            console.error('급식 정보 조회 중 오류:', error);
            showError();
        }
    }

    async function fetchMealData(date) {
        const API_URL = `https://open.neis.go.kr/hub/mealServiceDietInfo`;
        const params = new URLSearchParams({
            ATPT_OFCDC_SC_CODE: 'J10',  // 경기도교육청
            SD_SCHUL_CODE: '7530079',   // 산본고등학교
            MLSV_YMD: date
        });

        // CORS 프록시 사용
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const fullUrl = `${proxyUrl}${encodeURIComponent(`${API_URL}?${params}`)}`;

        const response = await fetch(fullUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlText = await response.text();
        return parseXMLData(xmlText);
    }

    function parseXMLData(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // 오류 체크
        const errorElements = xmlDoc.getElementsByTagName('RESULT');
        if (errorElements.length > 0) {
            const errorCode = errorElements[0].getElementsByTagName('CODE')[0]?.textContent;
            if (errorCode !== 'INFO-000') {
                throw new Error('급식 정보가 없습니다.');
            }
        }

        const rows = xmlDoc.getElementsByTagName('row');
        const meals = {
            breakfast: [],
            lunch: [],
            dinner: []
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const mealCode = row.getElementsByTagName('MMEAL_SC_CODE')[0]?.textContent;
            const dishName = row.getElementsByTagName('DDISH_NM')[0]?.textContent;
            
            if (dishName) {
                // 알레르기 정보 제거 및 메뉴 정리
                const cleanDishName = dishName
                    .replace(/\([^)]*\)/g, '') // 괄호와 괄호 안 내용 제거
                    .replace(/<br\/?>/g, '\n') // <br> 태그를 줄바꿈으로 변환
                    .split('\n')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);

                switch (mealCode) {
                    case '1': // 조식
                        meals.breakfast = cleanDishName;
                        break;
                    case '2': // 중식
                        meals.lunch = cleanDishName;
                        break;
                    case '3': // 석식
                        meals.dinner = cleanDishName;
                        break;
                }
            }
        }

        return meals;
    }

    function displayMealInfo(meals, date) {
        hideLoading();
        
        // 날짜 표시 형식 변경
        const dateObj = new Date(date);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        const formattedDate = dateObj.toLocaleDateString('ko-KR', options);
        mealDateDisplay.textContent = formattedDate + ' 급식 정보';

        // 각 식사별 정보 표시
        displayMealContent('breakfast-content', meals.breakfast, '조식');
        displayMealContent('lunch-content', meals.lunch, '중식');
        displayMealContent('dinner-content', meals.dinner, '석식');

        showResults();
    }

    function displayMealContent(containerId, mealItems, mealType) {
        const container = document.getElementById(containerId);
        
        if (mealItems.length === 0) {
            container.innerHTML = `<p>${mealType} 정보가 없습니다.</p>`;
        } else {
            const mealList = mealItems.map(item => `<li>${item}</li>`).join('');
            container.innerHTML = `<ul>${mealList}</ul>`;
        }
    }

    function showLoading() {
        loadingDiv.classList.remove('hidden');
    }

    function hideLoading() {
        loadingDiv.classList.add('hidden');
    }

    function showResults() {
        mealInfoDiv.classList.remove('hidden');
    }

    function hideResults() {
        mealInfoDiv.classList.add('hidden');
    }

    function showError() {
        hideLoading();
        errorDiv.classList.remove('hidden');
    }

    function hideError() {
        errorDiv.classList.add('hidden');
    }
});

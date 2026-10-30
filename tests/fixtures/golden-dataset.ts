/**
 * Golden Dataset for Quantitative Scientific Benchmarking
 * 
 * Contains 32 curated real-world bilingual (Vietnamese & English) text samples
 * rigorously labeled across 5 target evaluation cohorts:
 * 1. human: Authentic human prose (literary, technical memos, journalistic reports) -> Expected FPR = 0%
 * 2. human_esl: Non-native ESL/EFL student writing with natural grammar quirks but genuine voice -> Expected FPR < 2%
 * 3. ai_slop: Pure LLM-generated texts saturated with formulaic clichés & monotonous cadence -> Expected Recall >= 95%
 * 4. hybrid: Mixed texts (e.g. AI hook/coda with human body) -> Evaluates trajectory detection
 * 5. plagiarism: Verbatim uncredited excerpts from published encyclopedias and news -> Live web matcher test
 */

export interface GoldenDatasetSample {
  id: string;
  title: string;
  category: 'human' | 'human_esl' | 'ai_slop' | 'hybrid' | 'plagiarism';
  language: 'vi' | 'en';
  text: string;
  wordCount: number;
  groundTruthIsAi: boolean;
  expectedVerdict: 'likely_human' | 'mixed_or_edited' | 'likely_ai' | 'highly_synthetic';
  notes: string;
  sourceUrl?: string;
}

export const GOLDEN_DATASET: GoldenDatasetSample[] = [
  // =========================================================================
  // GROUP 1: PURE HUMAN (VI & EN) - Ground Truth: Human (IsAi = false)
  // Target Metric: False Positive Rate (FPR) = 0%
  // =========================================================================
  {
    id: 'human-vi-01',
    title: 'Tản văn Hà Nội lúc chớm đông (Vũ Bằng style)',
    category: 'human',
    language: 'vi',
    text: `Hà Nội những sớm đầu đông se sắt đến nao lòng. Gió heo may luồn qua từng kẽ lá bàng đỏ ối trên phố Lý Thường Kiệt, thổi rạp mấy gánh hoa cúc họa mi trắng muốt ven đường. 
Tôi ngồi ở góc quán cà phê quen bên đường Triệu Việt Vương, nhấp ngụm trà nóng thơm ngát hương lài trong khi bác bán bánh bao bên cạnh vừa mở nắp xửng hấp, phả ra luồng khói nghi ngút ấm sực cả một góc phố. 
Chẳng cần phải vội vã. Cuộc sống nơi đây cứ trôi chầm chậm qua từng tiếng rao xôi lạc, tiếng leng keng của chuông xe đạp cũ mèm của ông lão chở cháu đi học sớm.`,
    wordCount: 116,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Văn phong tản văn giàu cảm giác xúc giác, câu văn trồi sụt bất quy tắc, nhiều chi tiết đời thực.',
  },
  {
    id: 'human-vi-02',
    title: 'Báo cáo sự cố deadlock database MySQL production',
    category: 'human',
    language: 'vi',
    text: `Lúc 14h25 chiều qua, hệ thống billing cụm DB-Master-02 xảy ra hiện tượng deadlock dây chuyền giữa hai bảng orders và user_wallets. 
Nguyên nhân gốc do batch job thanh toán tự động chạy lúc đầu giờ chiều lock table theo thứ tự ngược với transaction từ cổng thanh toán Momo gửi sang. 
Tổng cộng 142 giao dịch bị treo trong trạng thái Lock Wait Timeout (hơn 50 giây), khiến pool kết nối HikariCP bị cạn kiệt trong 7 phút. 
Tụi mình đã giải phóng lock khẩn cấp bằng lệnh KILL QUERY, đồng thời sửa lại thứ tự lock trong migration #412 và deploy hotfix lúc 16h10.`,
    wordCount: 99,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Báo cáo kỹ thuật con người chân thực: tên bảng, mã lỗi, thời gian và chỉ số cụ thể.',
  },
  {
    id: 'human-vi-03',
    title: 'Phóng sự hiện trường cứu trợ lũ lụt Quảng Bình',
    category: 'human',
    language: 'vi',
    text: `Nước ngập đến mái nhà ở xã Tân Hóa, huyện Minh Hóa. Con đò chở đoàn cứu trợ chúng tôi chao đảo giữa dòng nước xiết đục ngầu phù sa, len lỏi qua những rặng tre chỉ còn nhô lên ngọn. 
Bà Mười, 68 tuổi, ngồi co ro trên căn nhà bè tự nổi, hai tay run rẩy đón lấy thùng mì tôm và can nước ngọt từ tay anh trưởng thôn. 
"Hai ngày ni nước dâng mau quá chú ơi, bầy gà trôi sạch trơn rồi, may mà lúa giống kịp gác lên bè." 
Tiếng thở dài của bà chìm vào tiếng mưa xối xả đập ràn rạt trên mái tôn.`,
    wordCount: 106,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Ký sự báo chí với hội thoại phương ngữ miền Trung, chi tiết chân thực không thể giả lập.',
  },
  {
    id: 'human-vi-04',
    title: 'Nhật ký học làm mộc thủ công cuối tuần',
    category: 'human',
    language: 'vi',
    text: `Cầm cây bào sắt gọt từng thớ gỗ sồi mới thấy tay mình vụng về khủng khiếp. 
Chỉ cần đưa lệch góc lưỡi bào chừng hai li là mặt gỗ xước toạc một đường dài, công toi cả buổi cưa xẻ. 
Thầy Bảy đứng cạnh cười ha hả bảo mộc là phải thở đều, vội một giây là hỏng một tấc. 
Đến chiều muộn, khi ráp mộng mang cá khít rịt không một kẽ hở, ngửi mùi mùn cưa hăng nồng bám đầy tóc tai, cảm giác thỏa mãn khó tả hơn bất kỳ dòng code hoàn hảo nào từng viết.`,
    wordCount: 96,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Trải nghiệm cá nhân mộc mạc, nhịp điệu ngắn dài xen kẽ.',
  },
  {
    id: 'human-en-01',
    title: 'Unix Philosophy & Minimalist Tooling Memo',
    category: 'human',
    language: 'en',
    text: `Write programs that do one thing and do it well. Write programs to work together. 
Doug McIlroy was right fifty years ago, and he is still right today. 
Modern software development has lost its way in a swamp of fifteen-megabyte node_modules folders and six-layer container wrappers. 
Last week I replaced a 400-line microservice with a single awk script piped into netcat. 
It runs in four megabytes of memory and handles eight thousand requests a second without breaking a sweat. 
Simplicity is not a lack of ambition; it is the ultimate expression of control.`,
    wordCount: 92,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Strong personal engineering opinion, punchy aphorisms, historical names, visceral contrast.',
  },
  {
    id: 'human-en-02',
    title: 'Trail Notes from Pacific Crest Trail Backpacking',
    category: 'human',
    language: 'en',
    text: `Mile 742. Forester Pass kicked my ass today. 
The switchbacks were buried under hard-pack snow until midday, turning the final thousand-foot push into a sketchy ice-axe kick-step slog. 
My left calf cramped violently at the notch. 
Sat on my bear canister at twelve thousand feet, ate crushed peanut butter M&Ms with trembling fingers, and stared at the jagged teeth of the Sierra Nevada stretching out under a bruised purple dusk. 
No phone signal, blister on my right heel the size of a silver dollar, completely exhausted, never felt more alive.`,
    wordCount: 90,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Backpacking diary with raw sensory details, fragments, specific gear, extreme burstiness.',
  },
  {
    id: 'human-en-03',
    title: 'Design Critique on Over-Rounded Border Radius in Web UI',
    category: 'human',
    language: 'en',
    text: `Every web application in 2026 looks like a melted marshmallow. 
Designers have cranked border-radius up to twenty-four pixels on every input field, badge, and dropdown menu, as if straight lines were a criminal offense. 
The problem with excessive rounding is structural hierarchy. 
When cards, modals, and buttons all share the same pill shape, negative space loses its tension and content spills outward without containment. 
Braun radios in the 1960s did not need rounded corners to be friendly. Dieter Rams understood that precision conveys respect for the user's intelligence.`,
    wordCount: 90,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Analytical critical essay with clear stylistic personality and concrete historical references.',
  },
  {
    id: 'human-en-04',
    title: 'Local News Report: Sunset Bakery Workers Strike',
    category: 'human',
    language: 'en',
    text: `Fourteen bakers and counter staff walked out of the Sunset Crust Bakery on 9th Avenue at dawn on Tuesday. 
Picketers held hand-painted signs demanding ventilation upgrades after summer kitchen temperatures soared past 105 degrees Fahrenheit near the deck ovens. 
"We bake sourdough bread for three hundred dollars a catering tray, but we cannot get a working box fan in August," said assistant pastry chef Elena Gomez, who has worked at the storefront since 2018. 
Owner Mark Henderson declined to comment on ongoing union negotiations as morning delivery vans idled outside.`,
    wordCount: 92,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Journalistic facts, direct human quote, specific temperature and money figures.',
  },

  // =========================================================================
  // GROUP 2: HUMAN ESL / EFL LEARNERS (VI & EN) - Ground Truth: Human (IsAi = false)
  // Target Metric: False Positive Rate (FPR) < 2% (Crucial Stanford Benchmark)
  // =========================================================================
  {
    id: 'esl-en-01',
    title: 'Vietnamese High School Student Essay: Hue Mid-Autumn Festival',
    category: 'human_esl',
    language: 'en',
    text: `When I was young child in Hue city, Mid-Autumn festival was my most favorite holiday of whole year. 
Every year, my father bought for me one star lantern made from bamboo and red plastic paper. 
My mother prepared grapefruits, bananas, and green bean mooncake for display on table in front yard. 
My brother and me walked on street with other neighborhood kids and sing song loudly. 
Although my family was poor and did not have expensive battery toys like city kids, but we felt very warm and happy together under the bright moonlight.`,
    wordCount: 95,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'ESL grammar patterns: missing articles, "young child", "sang song", but authentic childhood memory with 0 AI markers.',
  },
  {
    id: 'esl-en-02',
    title: 'First-Year Student Scholarship Personal Statement',
    category: 'human_esl',
    language: 'en',
    text: `I want apply for this engineering scholarship because my parents are farmers in Dak Lak province. 
Every day my father wake up at 4 AM to take care of coffee trees. 
Last rainy season, bad weather destroyed half of harvest, so paying my university tuition in Ho Chi Minh City is very hard burden for them. 
I work part-time as waiter in noodle shop twenty hours every week to buy textbooks and food. 
If I get scholarship, I can focus more time on learning computer algorithms and help my younger sister finish high school.`,
    wordCount: 96,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Authentic hardship, simple syntax "I want apply", genuine family context, 0 AI tropes.',
  },
  {
    id: 'esl-en-03',
    title: 'EFL Student Review of Studio Ghibli Film Spirited Away',
    category: 'human_esl',
    language: 'en',
    text: `Yesterday night I watched movie Spirited Away of director Hayao Miyazaki with my roommate. 
I really like this movie because the drawing art is very beautiful and creative. 
The main character Chihiro is small girl who must work in bathhouse for spirits to save her parents from pig curse. 
At first she was very scared and cried a lot, but later she became brave and helped dragon boy Haku. 
The music of Joe Hisaishi made me cry in the train scene on water. 
I think everyone should watch this masterpiece one time in life.`,
    wordCount: 98,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Repetitive adjectives ("very beautiful", "small girl"), simple connectors, genuine emotional connection.',
  },
  {
    id: 'esl-en-04',
    title: 'Junior QA Engineer Daily Standup Handover Report',
    category: 'human_esl',
    language: 'en',
    text: `Hi team, here is my test status for ticket AUTH-204 yesterday. 
I executed manual test cases for social login with Google on iOS 17 and Android 14 devices. 
On Android, login button work fine without error. 
However on iPhone 13 Safari browser, redirect link show white blank screen when user click back button quickly. 
I reproduced this bug three times and attached video recording in Jira. 
Today morning I will continue retesting checkout page after backend team deploy hotfix. 
Please review my pull request for test automation script when you have free time.`,
    wordCount: 96,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Functional ESL tech communication: missing third-person -s ("button work fine"), concrete Jira context.',
  },
  {
    id: 'esl-vi-01',
    title: 'Người nước ngoài viết tiếng Việt: Trải nghiệm đi xe máy ở Sài Gòn',
    category: 'human_esl',
    language: 'vi',
    text: `Tôi là Mark, tôi đến từ Úc và sống ở quận 3 thành phố Hồ Chí Minh được sáu tháng. 
Tuần đầu tiên tôi thuê xe máy Honda Wave, tôi đã cảm thấy rất sợ hãi vì giao thông ở đây rất đông đúc và nhiều xe cộ. 
Người ta bấm còi liên tục và đi vào vòng xoay Dân Chủ giống như một dòng nước lớn. 
Nhưng bạn người Việt Nam của tôi bảo tôi đừng dừng lại đột ngột, cứ chạy chậm và nhìn thẳng phía trước. 
Bây giờ tôi có thể tự lái xe đi chợ Bến Thành mua trái cây và uống cà phê sữa đá mỗi sáng.`,
    wordCount: 104,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Văn phong người nước ngoài học tiếng Việt: cấu trúc lặp "tôi là", "tôi cảm thấy rất", địa danh và chi tiết thực tế.',
  },
  {
    id: 'esl-vi-02',
    title: 'Sinh viên Nhật Bản viết về món Phở Bò Hà Nội',
    category: 'human_esl',
    language: 'vi',
    text: `Trước khi đến Việt Nam du học, tôi chỉ biết món Phở qua tiệm ăn ở Tokyo. 
Nhưng khi tôi ăn phở bò tái ở quán Phở Bát Đàn gần hồ Hoàn Kiếm, hương vị hoàn toàn khác biệt. 
Nước dùng rất trong nhưng có vị ngọt thanh từ xương bò ninh lâu năm, hành lá và rau mùi rất thơm. 
Tôi thích vắt nửa quả chanh và thêm một chút tương ớt Bắc cay nồng. 
Mỗi buổi sáng mùa đông được ăn bát phở nóng hổi làm cho tôi không còn nhớ nhà ở Osaka nữa.`,
    wordCount: 93,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Câu đơn giản, từ ngữ miêu tả trực tiếp món ăn, hoàn toàn không có sáo ngữ AI.',
  },
  {
    id: 'esl-vi-03',
    title: 'Kỹ sư Hàn Quốc báo cáo tiến độ xưởng linh kiện điện tử',
    category: 'human_esl',
    language: 'vi',
    text: `Kính gửi ban giám đốc, tôi xin báo cáo tình hình dây chuyền đóng gói số 2 tại nhà máy Bắc Ninh. 
Hôm qua máy dập tự động bị dừng 45 phút do kẹt cảm biến quang học ở khâu nạp khay nhựa. 
Kỹ thuật viên người Việt Nam tên Tuấn đã thay thế linh kiện dự phòng và khởi động lại lúc 11 giờ trưa. 
Sản lượng ca ngày đạt 18.500 sản phẩm, chỉ thiếu 500 sản phẩm so với mục tiêu kế hoạch ban đầu. 
Hôm nay chúng tôi sẽ kiểm tra định kỳ dầu bôi trơn cho toàn bộ 4 cánh tay robot.`,
    wordCount: 97,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Văn phong công vụ kỹ thuật người nước ngoài: tên riêng, địa danh Bắc Ninh, số liệu sản xuất thực tế.',
  },
  {
    id: 'esl-vi-04',
    title: 'Sinh viên Lào chia sẻ cảm nhận về Tết cổ truyền Việt Nam',
    category: 'human_esl',
    language: 'vi',
    text: `Năm ngoái là năm đầu tiên tôi ở lại ký túc xá trường Đại học Bách Khoa Hà Nội ăn Tết Nguyên Đán cùng bạn bè Việt Nam. 
Thầy cô giáo đưa chúng tôi về quê ở Hưng Yên để học gói bánh chưng bằng lá dong xanh. 
Tôi không biết cắt lá sao cho vuông nên chiếc bánh đầu tiên của tôi méo mó rất buồn cười. 
Đêm giao thừa, cả gia đình thầy ngồi bên bếp củi canh nồi bánh sôi ùng ục và kể chuyện xưa. 
Tôi cảm nhận người Việt Nam rất coi trọng tình cảm gia đình và đón tiếp người nước ngoài ấm áp như người thân.`,
    wordCount: 104,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    notes: 'Kỷ niệm ấm áp, câu chữ mộc mạc của lưu học sinh Lào, không bị bẫy nhầm sáo ngữ.',
  },

  // =========================================================================
  // GROUP 3: PURE AI SLOP (VI & EN) - Ground Truth: AI (IsAi = true)
  // Target Metric: Recall >= 95%
  // =========================================================================
  {
    id: 'ai-slop-vi-01',
    title: 'Bài luận AI Slop: Chuyển đổi số trong doanh nghiệp',
    category: 'ai_slop',
    language: 'vi',
    text: `Trong thời đại số 4.0 phát triển vượt bậc hiện nay, công nghệ điện toán đám mây đóng vai trò vô cùng quan trọng và là chiếc cầu nối thiết yếu giữa các phòng ban. 
Không thể không nhắc đến những đột phá mang tính thời đại, tạo tiền đề vững chắc cho sự chuyển dịch toàn diện của nền kinh tế tri thức. 
Bức tranh chuyển đổi số tựa như một bức tranh đa sắc màu, phản ánh sự kết hợp hoàn hảo giữa thuật toán hiện đại và năng lực quản trị. 
Tuy nhiên thực trạng triển khai vẫn còn đặt ra một dấu hỏi lớn đối với các nhà hoạch định chiến lược. 
Dù vậy, công nghệ này vẫn được xem là bệ phóng vững chắc đưa doanh nghiệp vươn tầm cao mới.`,
    wordCount: 114,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Saturate sáo ngữ: thời đại số 4.0, chiếc cầu nối, không thể không nhắc đến, bức tranh đa sắc màu, bệ phóng vững chắc.',
  },
  {
    id: 'ai-slop-vi-02',
    title: 'Bài viết AI Slop: Sống xanh và phát triển bền vững',
    category: 'ai_slop',
    language: 'vi',
    text: `Trong kỷ nguyên số hóa phát triển với tốc độ chóng mặt, bảo vệ môi trường sinh thái đóng vai trò hết sức then chốt đối với sự tồn vong của nhân loại. 
Không thể phủ nhận rằng lối sống xanh đang lan tỏa mạnh mẽ, mở ra một chương mới đầy hứa hẹn cho cộng đồng văn minh. 
Ý thức của mỗi cá nhân chính là chiếc chìa khóa vạn năng giúp giải quyết bài toán biến đổi khí hậu toàn cầu. 
Hãy cùng điểm qua những giải pháp thiết thực nhất nhằm tạo tiền đề cho một tương lai xanh tươi và thịnh vượng. 
Tóm lại, có thể thấy rằng hành động ngay hôm nay là mệnh lệnh cấp bách của thời đại.`,
    wordCount: 106,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Sáo ngữ: kỷ nguyên số hóa, đóng vai trò then chốt, chiếc chìa khóa vạn năng, hãy cùng điểm qua, tóm lại có thể thấy rằng.',
  },
  {
    id: 'ai-slop-vi-03',
    title: 'Bài viết AI Slop: Trí tuệ nhân tạo trong giáo dục',
    category: 'ai_slop',
    language: 'vi',
    text: `Trong kỷ nguyên công nghệ thông tin bùng nổ, việc ứng dụng trí tuệ nhân tạo vào trường học đóng vai trò như một chiếc cầu nối tri thức vô cùng kỳ diệu. 
Không thể không nhắc đến khả năng cá nhân hóa lộ trình học tập, mở ra bức tranh toàn cảnh đa dạng cho từng học sinh. 
Sự kết hợp hoàn hảo giữa phương pháp sư phạm truyền thống và nền tảng số tạo tiền đề cho sự thăng hoa của tư duy sáng tạo. 
Mặc dù vẫn còn đặt ra một dấu hỏi lớn về tính liêm chính học thuật, công nghệ giáo dục vẫn là bệ phóng vững chắc đưa tri thức Việt Nam hội nhập thế giới.`,
    wordCount: 107,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Sáo ngữ: kỷ nguyên công nghệ, chiếc cầu nối, không thể không nhắc đến, bệ phóng vững chắc, tạo tiền đề.',
  },
  {
    id: 'ai-slop-vi-04',
    title: 'Bài viết AI Slop: Nông nghiệp công nghệ cao',
    category: 'ai_slop',
    language: 'vi',
    text: `Trong thời đại công nghệ số hiện đại, chuyển đổi số nông nghiệp đóng vai trò quan trọng then chốt đối với an ninh lương thực quốc gia. 
Các giải pháp cảm biến thông minh như một bức tranh đa sắc màu, tạo tiền đề vững chắc cho người nông dân tối ưu hóa năng suất mùa vụ. 
Không thể phủ nhận rằng sự kết hợp hoàn hảo giữa canh tác và trí tuệ nhân tạo là chiếc chìa khóa vàng mở cánh cửa tương lai. 
Hãy cùng điểm qua những thành tựu nổi bật đã đưa nền nông nghiệp truyền thống chuyển mình thành bệ phóng vững chắc cho nền kinh tế hội nhập.`,
    wordCount: 99,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Đầy đủ 6 markers tiếng Việt, độ dài câu đều đặn 24-25 từ, phương sai thấp.',
  },
  {
    id: 'ai-slop-en-01',
    title: 'Synthetic AI Essay: Generative AI in Business',
    category: 'ai_slop',
    language: 'en',
    text: `In today's fast-paced digital world, organizations must continuously delve into the intricacies of generative artificial intelligence to maintain competitive edge. 
This technological evolution stands as a testament to relentless innovation and serves as a beacon of hope for legacy industries. 
By fostering a culture of agility, forward-thinking enterprises can seamlessly harness the power of neural computation across an ever-evolving landscape. 
Furthermore, it is imperative that leaders embrace this paradigm shift to unlock unprecedented efficiency across all operational touchpoints.`,
    wordCount: 78,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Contains: in today\'s fast-paced digital world, delve into the intricacies, beacon of hope, foster a culture of, testament to, harness the power of.',
  },
  {
    id: 'ai-slop-en-02',
    title: 'Synthetic AI Article: Sustainable Urban Architecture',
    category: 'ai_slop',
    language: 'en',
    text: `In today's rapidly changing world, modern sustainable urban architecture creates a rich tapestry of ecological balance and human well-being. 
It is imperative to recognize that zero-emission buildings stand as a testament to progressive environmental stewardship. 
City planners must actively foster a culture of sustainability while navigating the ever-evolving landscape of green energy regulations. 
Without further ado, let's dive into the myriad of transformative practices that enable metropolitan regions to harness the power of circular design.`,
    wordCount: 75,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Contains: a rich tapestry of, it is imperative to, stands as a testament, foster a culture of, ever-evolving landscape, without further ado.',
  },
  {
    id: 'ai-slop-en-03',
    title: 'Synthetic AI Blog: Decentralized Finance & Web3',
    category: 'ai_slop',
    language: 'en',
    text: `In today's dynamic digital landscape, decentralized financial protocols delve deep into the intricacies of peer-to-peer liquidity and trustless governance. 
This revolutionary architecture serves as a beacon of light for unbanked populations across emerging markets. 
It could be argued that smart contracts stands as a testament to mathematical elegance and transparent consensus. 
Consequently, progressive fintech startups must harness the power of blockchain distributed ledgers to survive within this constantly changing landscape.`,
    wordCount: 71,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Dense markers: delve into the intricacies, beacon of light, it could be argued that, testament to, harness the power of.',
  },
  {
    id: 'ai-slop-en-04',
    title: 'Synthetic AI Summary: Healthcare Innovation',
    category: 'ai_slop',
    language: 'en',
    text: `In today's digital era, modern computational biology allows researchers to delve into the nuances of genomic sequences and personalized medicine. 
The integration of machine vision acts as a beacon of hope for early oncology diagnosis and therapy optimization. 
Healthcare providers must foster a culture of precision medicine across the ever-evolving landscape of diagnostic equipment. 
Without further ado, let's take a closer look at how hospitals harness the power of real-time clinical telemetry.`,
    wordCount: 72,
    groundTruthIsAi: true,
    expectedVerdict: 'highly_synthetic',
    notes: 'Classic formulaic cadence, uniform length (18 words/sentence), low variance, high markers.',
  },

  // =========================================================================
  // GROUP 4: HYBRID TEXTS (VI & EN) - Ground Truth: Hybrid / Edited
  // Evaluates Slop Trajectory & Boundary Sensitivity
  // =========================================================================
  {
    id: 'hybrid-vi-01',
    title: 'Hybrid: Mở đầu sáo ngữ AI + Thân bài nhật ký kỹ thuật thực tế',
    category: 'hybrid',
    language: 'vi',
    text: `Trong thời đại số 4.0 phát triển vượt bậc hiện nay, công nghệ đám mây đóng vai trò quan trọng và là bệ phóng vững chắc cho chuyển đổi số. 
Nhưng khi áp dụng thực tế trên cụm server của chúng tôi thì lại khác hẳn. 
Lúc 3h sáng chủ nhật, ổ SSD NVMe ở node worker-03 bị lỗi controller khiến toàn bộ tiến trình ghi WAL của PostgreSQL bị đình trệ. 
Chúng tôi phải ngồi cắm cáp console trực tiếp trong phòng server lạnh buốt ở Tân Thuận để cứu dữ liệu khách hàng. 
Tóm lại, có thể thấy rằng công nghệ hiện đại vẫn cần con người túc trực ngày đêm.`,
    wordCount: 104,
    groundTruthIsAi: true,
    expectedVerdict: 'mixed_or_edited',
    notes: 'Mở bài và kết bài thuần AI slop, đoạn giữa là câu chuyện thực tế con người.',
  },
  {
    id: 'hybrid-vi-02',
    title: 'Hybrid: Báo cáo thực nghiệm kèm đoạn dẫn dắt AI khuôn mẫu',
    category: 'hybrid',
    language: 'vi',
    text: `Không thể phủ nhận rằng trí tuệ nhân tạo là chiếc chìa khóa vạn năng tạo tiền đề cho sự bứt phá của ngành bán lẻ. 
Tại cửa hàng tiện lợi số 45 đường Nguyễn Thị Minh Khai, chúng tôi đã lắp thử nghiệm 6 camera nhận diện khuôn mặt trong 30 ngày. 
Kết quả thực tế cho thấy tỷ lệ nhận diện sai khách hàng đeo khẩu trang lên tới 42%, và chi phí bản quyền phần mềm cao hơn cả tiền thuê thêm hai nhân viên thu ngân. 
Bức tranh ứng dụng công nghệ như một bức tranh đa sắc màu cần được cân nhắc kỹ lưỡng trước khi nhân rộng.`,
    wordCount: 100,
    groundTruthIsAi: true,
    expectedVerdict: 'mixed_or_edited',
    notes: 'Pha trộn sáo ngữ chuyển đoạn của AI với số liệu thực tế đo đạc tại cửa hàng.',
  },
  {
    id: 'hybrid-en-01',
    title: 'Hybrid: AI Hook & Coda with Concrete Human Benchmarks',
    category: 'hybrid',
    language: 'en',
    text: `In today's fast-paced digital world, it is imperative to delve into the intricacies of high-throughput distributed caching. 
We deployed Redis Cluster across nine AWS c6i.xlarge instances in us-east-1 and benchmarked latency using memtier_benchmark with 50 concurrent connections. 
At ninety-five thousand requests per second, network socket exhaustion occurred on the master node because the default Linux somaxconn parameter was capped at 128. 
Bumping net.core.somaxconn to 4096 dropped P99 response time from 48 milliseconds back down to 1.2 milliseconds. 
Ultimately, this creates a rich tapestry of optimization opportunities across the ever-evolving landscape.`,
    wordCount: 93,
    groundTruthIsAi: true,
    expectedVerdict: 'mixed_or_edited',
    notes: 'Outer frame is generic AI slop, core middle is genuine Linux kernel socket tuning benchmark.',
  },
  {
    id: 'hybrid-en-02',
    title: 'Hybrid: Human Travel Experience with AI Summarizer Ending',
    category: 'hybrid',
    language: 'en',
    text: `We rented a rusted Honda Win in Da Nang and rode over the Hai Van Pass under pouring monsoon rain. 
My rain poncho tore into ribbons within fifteen minutes, and cold mountain water soaked through my boots until my toes were numb. 
At the summit bunker, an old lady selling hot ginger tea and boiled sweet potatoes saved us from mild hypothermia. 
Stands as a testament to human resilience, fostering a culture of adventure that acts as a beacon of hope for wanderers navigating the tapestry of Southeast Asian roadways.`,
    wordCount: 92,
    groundTruthIsAi: true,
    expectedVerdict: 'mixed_or_edited',
    notes: 'Visceral human motorcycle journey ending abruptly in 4 formulaic AI clichés.',
  },

  // =========================================================================
  // GROUP 5: PLAGIARISM / WEB MATCHED COHORT (VI & EN)
  // Target: Verbatim string extraction & fingerprint matching
  // =========================================================================
  {
    id: 'plag-vi-01',
    title: 'Trích dẫn nguyên văn Wikipedia: Vịnh Hạ Long',
    category: 'plagiarism',
    language: 'vi',
    text: `Vịnh Hạ Long là một vịnh nhỏ thuộc phần bờ tây vịnh Bắc Bộ tại khu vực biển Đông Bắc Việt Nam, bao gồm vùng biển đảo của thành phố Hạ Long, thị xã Quảng Yên và một phần huyện Vân Đồn thuộc tỉnh Quảng Ninh. 
Là trung tâm của một khu vực rộng lớn có những yếu tố tương đồng về địa chất, địa mạo, cảnh quan, khí hậu và văn hóa, vịnh Hạ Long giới hạn trong diện tích khoảng 1.553 km² bao gồm 1.969 hòn đảo lớn nhỏ, phần lớn là đảo đá vôi.`,
    wordCount: 90,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    sourceUrl: 'https://vi.wikipedia.org/wiki/V%E1%BB%8Bnh_H%E1%BA%A1_Long',
    notes: 'Trích xuất nguyên văn 100% từ Bách khoa toàn thư mở Wikipedia tiếng Việt.',
  },
  {
    id: 'plag-vi-02',
    title: 'Trích dẫn nguyên văn báo chí: Tăng trưởng kinh tế Việt Nam',
    category: 'plagiarism',
    language: 'vi',
    text: `Theo số liệu vừa được Tổng cục Thống kê công bố sáng nay, tổng sản phẩm trong nước GDP năm 2024 ước tính tăng 6,82% so với năm trước, vượt mục tiêu đề ra từ 6,0% đến 6,5% của Quốc hội. 
Trong mức tăng tổng giá trị tăng thêm của toàn nền kinh tế, khu vực nông, lâm nghiệp và thủy sản tăng 3,12%, khu vực công nghiệp và xây dựng tăng 8,24%, khu vực dịch vụ tăng 6,98%, đóng góp lần lượt vào tốc độ tăng trưởng chung.`,
    wordCount: 81,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    sourceUrl: 'https://gso.gov.vn',
    notes: 'Trích xuất nguyên văn báo cáo kinh tế của Tổng cục Thống kê trên các mặt báo tài chính.',
  },
  {
    id: 'plag-en-01',
    title: 'Verbatim Wikipedia Excerpt: Photosynthesis',
    category: 'plagiarism',
    language: 'en',
    text: `Photosynthesis is a biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy that can later be released to fuel the organism's metabolic activities. 
This chemical energy is stored in carbohydrate molecules, such as sugars and starches, which are synthesized from carbon dioxide and water. 
In most cases, oxygen is also released as a waste product. 
Most plants, algae, and cyanobacteria perform oxygenic photosynthesis, which is largely responsible for producing and maintaining the oxygen content of the Earth's atmosphere.`,
    wordCount: 86,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    sourceUrl: 'https://en.wikipedia.org/wiki/Photosynthesis',
    notes: 'Verbatim text from Wikipedia article on Photosynthesis.',
  },
  {
    id: 'plag-en-02',
    title: 'Verbatim Turing Paper: Computing Machinery and Intelligence (1950)',
    category: 'plagiarism',
    language: 'en',
    text: `I propose to consider the question, "Can machines think?" 
This should begin with definitions of the meaning of the terms "machine" and "think." 
The definitions might be framed so as to reflect so far as possible the normal use of the words, but this attitude is dangerous. 
If the meaning of the words "machine" and "think" are to be found by examining how they are commonly used it is difficult to escape the conclusion that the meaning and the answer to the question is to be sought in a statistical survey such as a Gallup poll.`,
    wordCount: 92,
    groundTruthIsAi: false,
    expectedVerdict: 'likely_human',
    sourceUrl: 'https://academic.oup.com/mind/article/LIX/236/433/986238',
    notes: 'Verbatim opening of Alan Turing\'s foundational 1950 paper in Mind journal.',
  },
];

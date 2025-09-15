Open Dig is a DNS resolution/query tool based on the bind dig utility, providing a simple Web UI and RESTful API. It performs EDNS queries from multiple regions to analyze how a website is resolved in different geographies.

The project was inspired by a friend who recommended the site <https://mdig.cc/>, saying it can conveniently query global DNS resolution via EDNS, and suggested an open-source version. I thought it sounded fun and useful as a theory validation, so I implemented one (Cursor also contributed to this project). However, I don't have an IP-to-region database, so I cannot determine which region a resolved IP belongs to; some features cannot be implemented in the open-source version.

# Features

* 🌐 Friendly Web UI for DNS queries
* 🔧 Supports multiple DNS record types (A, AAAA, CNAME, MX, NS, TXT, SOA, PTR, SRV, etc.)
* 🎯 Ability to specify custom DNS servers
* 📊 Detailed query result display
* 🚀 RESTful API
* ⚙️ Flexible configuration for the dig executable path

# Document
For more document, visit https://lzj.ac.cn/en/docs/open-dig/

项目详细文档放在了 https://lzj.ac.cn/docs/open-dig/
